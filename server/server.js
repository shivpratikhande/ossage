const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Connection, PublicKey } = require("@solana/web3.js");
const SolanaService = require('./solana-service');
require("dotenv").config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

const solanaConnection = new Connection("https://api.devnet.solana.com");
const solanaService = new SolanaService(solanaConnection);

const installationTokens = new Map();
const userInstallations = new Map();

function generateAppJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + (10 * 60),
    iss: GITHUB_APP_ID
  };
  
  return jwt.sign(payload, GITHUB_PRIVATE_KEY, { algorithm: 'RS256' });
}
async function getInstallationToken(installationId) {
  const cached = installationTokens.get(installationId);
  if (cached && cached.expires_at > new Date()) {
    return cached.token;
  }

  try {
    const appJWT = generateAppJWT();
    const response = await axios.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${appJWT}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const token = response.data.token;
    const expiresAt = new Date(response.data.expires_at);
    
    installationTokens.set(installationId, {
      token,
      expires_at: expiresAt
    });

    return token;
  } catch (error) {
    console.error('Failed to get installation token:', error.response?.data || error.message);
    throw error;
  }
}

app.get("/github/connect", (req, res) => {
  const redirect = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email,read:org`;
  res.redirect(redirect);
});

app.get("/github/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `token ${accessToken}` },
    });

    const username = userRes.data.login;
    console.log(`🔗 User connected: ${username}`);

    await getUserInstallations(username, accessToken);
    res.redirect(`${FRONTEND_URL}/githubmanager/?username=${username}`);
  } catch (err) {
    console.error("OAuth error:", err.message);
    res.status(500).send("GitHub OAuth failed");
  }
});

async function getUserInstallations(username, userToken) {
  try {
    const response = await axios.get(
      "https://api.github.com/user/installations",
      {
        headers: { 
          Authorization: `token ${userToken}`,
          Accept: "application/vnd.github.v3+json"
        },
      }
    );

    const installations = response.data.installations.filter(
      installation => installation.app_id.toString() === GITHUB_APP_ID
    );

    userInstallations.set(username, installations);
    console.log(`Found ${installations.length} app installations for ${username}`);
    
    return installations;
  } catch (error) {
    console.error("Failed to get user installations:", error.response?.data || error.message);
    
    try {
      console.log("Trying alternative approach - getting all app installations...");
      const appJWT = generateAppJWT();
      const appInstallationsResponse = await axios.get(
        "https://api.github.com/app/installations",
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );

      const relevantInstallations = appInstallationsResponse.data.filter(
        installation => installation.account.login === username
      );

      userInstallations.set(username, relevantInstallations);
      console.log(`Found ${relevantInstallations.length} app installations for ${username} (via app endpoint)`);
      
      return relevantInstallations;
    } catch (appError) {
      console.error("Failed to get app installations:", appError.response?.data || appError.message);
      return [];
    }
  }
}

app.post("/wallet/create/:repoFullName", async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    
    if (solanaService.hasRepositoryWallet(repoFullName)) {
      return res.status(400).json({ error: "Wallet already exists for this repository" });
    }
    
    const walletInfo = await solanaService.createRepositoryWallet(repoFullName);
    res.json(walletInfo);
  } catch (error) {
    console.error("Failed to create wallet:", error.message);
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

app.get("/wallet/:repoFullName", async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    const walletInfo = solanaService.getRepositoryWallet(repoFullName);
    
    if (!walletInfo) {
      return res.status(404).json({ error: "Wallet not found for this repository" });
    }
    
    const updatedWallet = await solanaService.updateWalletBalance(repoFullName);
    res.json(updatedWallet || walletInfo);
  } catch (error) {
    console.error("Failed to get wallet info:", error.message);
    res.status(500).json({ error: "Failed to get wallet info" });
  }
});

app.post("/wallet/fund/:repoFullName", async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    const result = await solanaService.fundWalletFromFaucet(repoFullName);
    res.json(result);
  } catch (error) {
    console.error("Failed to fund wallet:", error.message);
    res.status(500).json({ error: "Failed to fund wallet" });
  }
});

app.post("/contributor/register", async (req, res) => {
  try {
    const { username, solanaAddress } = req.body;
    
    if (!username || !solanaAddress) {
      return res.status(400).json({ error: "Username and Solana address are required" });
    }
    
    try {
      new PublicKey(solanaAddress);
    } catch (error) {
      return res.status(400).json({ error: "Invalid Solana address" });
    }
    
    solanaService.registerContributor(username, solanaAddress);
    
    res.json({ 
      message: "Solana address registered successfully",
      username,
      solanaAddress
    });
  } catch (error) {
    console.error("Failed to register contributor:", error.message);
    res.status(500).json({ error: "Failed to register contributor" });
  }
});

app.get("/contributor/:username", (req, res) => {
  const username = req.params.username;
  const solanaAddress = solanaService.getContributorAddress(username);
  
  if (!solanaAddress) {
    return res.status(404).json({ error: "Contributor not registered" });
  }
  
  res.json({ username, solanaAddress });
});

app.get("/github/repos/:username", async (req, res) => {
  const username = req.params.username;
  let installations = userInstallations.get(username) || [];
  
  if (installations.length === 0) {
    return res.status(404).json({ 
      error: "No GitHub App installations found. Please install the GitHub App on your repositories." 
    });
  }

  try {
    let allRepos = [];
    
    for (const installation of installations) {
      const token = await getInstallationToken(installation.id);
      
      const repoResponse = await axios.get(
        `https://api.github.com/installation/repositories`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );
      
      const repos = repoResponse.data.repositories.map(repo => {
        const walletInfo = solanaService.getRepositoryWallet(repo.full_name);
        
        return {
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          description: repo.description,
          updated_at: repo.updated_at,
          installation_id: installation.id,
          hasWebhook: true,
          wallet: walletInfo || null
        };
      });
      
      allRepos = allRepos.concat(repos);
    }

    res.json(allRepos);
  } catch (error) {
    console.error("Failed to fetch repositories:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const payload = req.body;

  if (!WEBHOOK_SECRET) {
    console.error("❌ WEBHOOK_SECRET not set in environment variables");
    return res.status(500).send("Server configuration error");
  }

  const expected = `sha256=` + crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    console.error("❌ Invalid webhook signature");
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];
  
  try {
    const body = JSON.parse(payload.toString());

    console.log(`📨 Received ${event} event from ${body.repository?.full_name}`);

    if (event === "pull_request") {
      handlePullRequestEvent(body);
    } else if (event === "ping") {
      console.log("🏓 Webhook ping received - GitHub App is working!");
      return res.json({ message: "pong" });
    } else if (event === "installation") {
      handleInstallationEvent(body);
    }

    res.send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    res.status(400).send("Invalid JSON payload");
  }
});

function handleInstallationEvent(body) {
  const action = body.action;
  const installation = body.installation;
  
  console.log(`🔧 Installation ${action} for ${installation.account.login}`);
  
  if (action === "created") {
    console.log(`✅ GitHub App installed on ${installation.account.login}`);
    
    const username = installation.account.login;
    const currentInstallations = userInstallations.get(username) || [];
    const updatedInstallations = [...currentInstallations, installation];
    userInstallations.set(username, updatedInstallations);
    
  } else if (action === "deleted") {
    console.log(`❌ GitHub App uninstalled from ${installation.account.login}`);
    installationTokens.delete(installation.id);
  }
}

function handlePullRequestEvent(body) {
  const action = body.action;
  const pr = body.pull_request;
  const repository = body.repository;
  const installation = body.installation;

  if (action === "closed" && pr.merged) {
    const contributor = pr.user.login;
    const additions = pr.additions;
    const deletions = pr.deletions;
    const filesChanged = pr.changed_files;
    const prNumber = pr.number;
    const prTitle = pr.title;

    console.log(`🔄 PR #${prNumber} merged in ${repository.full_name}`);
    console.log(`   Author: ${contributor}, Changes: +${additions} -${deletions}, Files: ${filesChanged}`);

    if (additions >= 0 && filesChanged >= 0) {
      console.log(`🎉 REWARD: ${contributor} qualifies for reward!`);
      
      rewardContributor(contributor, {
        repository: repository.full_name,
        prNumber,
        additions,
        filesChanged,
        prTitle,
        installation_id: installation.id
      });
    }
  }
}

async function rewardContributor(username, prData) {
  console.log(`💰 Processing reward for ${username}`);
  
  const rewardAmount = calculateReward(prData.additions, prData.filesChanged);
  const rewardSol = rewardAmount / 10000; // Convert points to SOL
  
  const walletInfo = solanaService.getRepositoryWallet(prData.repository);
  const contributorAddress = solanaService.getContributorAddress(username);
  
  let rewardSent = false;
  
  if (walletInfo && contributorAddress) {
    try {
      console.log(`🏦 Sending ${rewardSol} SOL reward to ${username}`);
      
      const result = await solanaService.sendReward(walletInfo, contributorAddress, rewardSol, prData);
      rewardSent = true;
      
      console.log(`✅ Reward sent successfully: ${result.signature}`);
    } catch (error) {
      console.error(`❌ Failed to send reward:`, error.message);
    }
  }
  
  // await createThankYouComment(prData, walletInfo, contributorAddress, rewardSent, rewardSol);
}

function calculateReward(additions, filesChanged) {
  const baseReward = 100;
  const additionBonus = Math.min(additions * 2, 500);
  const fileBonus = Math.min(filesChanged * 10, 200);
  
  return baseReward + additionBonus + fileBonus;
}

app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "GitHub App Server with Enhanced Solana Integration",
    timestamp: new Date().toISOString(),
    wallets_created: solanaService.getWalletCount(),
    contributors_registered: solanaService.getContributorCount()
  });
});


app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Enhanced GitHub App Server started at http://localhost:${PORT}`);
  console.log(`🏦 Solana Integration: ✅ Enabled (Devnet)`);
});