const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// Raw body parser for webhook signature verification MUST come before JSON parser
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Store installation tokens (use Redis/DB in production)
const installationTokens = new Map();
const userInstallations = new Map();

// ====================
// GitHub App JWT Generator
// ====================
function generateAppJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds in the past
    exp: now + (10 * 60), // Expires in 10 minutes
    iss: GITHUB_APP_ID
  };
  
  return jwt.sign(payload, GITHUB_PRIVATE_KEY, { algorithm: 'RS256' });
}

// ====================
// Get Installation Access Token
// ====================
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

// ====================
// GitHub App OAuth (for user identification)
// ====================
app.get("/github/connect", (req, res) => {
  // Updated scope to include read:org for GitHub App installations
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

    // Get user's app installations
    await getUserInstallations(username, accessToken);

    res.redirect(`${FRONTEND_URL}/?username=${username}`);
  } catch (err) {
    console.error("OAuth error:", err.message);
    res.status(500).send("GitHub OAuth failed");
  }
});

// ====================
// Get User's App Installations - Alternative approach
// ====================
async function getUserInstallations(username, userToken) {
  try {
    // First try the user installations endpoint
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
    
    // If user installations fail, try getting all app installations and filter by user
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

      // Filter installations by the current user
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

// ====================
// List Accessible Repositories
// ====================
app.get("/github/repos/:username", async (req, res) => {
  const username = req.params.username;
  let installations = userInstallations.get(username) || [];
  
  // If no cached installations, try to get them using the app JWT
  if (installations.length === 0) {
    try {
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

      installations = appInstallationsResponse.data.filter(
        installation => installation.account.login === username
      );
      
      if (installations.length > 0) {
        userInstallations.set(username, installations);
      }
    } catch (error) {
      console.error("Failed to get installations:", error.response?.data || error.message);
    }
  }
  
  if (installations.length === 0) {
    return res.status(404).json({ 
      error: "No GitHub App installations found. Please install the GitHub App on your repositories." 
    });
  }

  try {
    let allRepos = [];
    
    for (const installation of installations) {
      const token = await getInstallationToken(installation.id);
      
      // Get repositories accessible to this installation
      const repoResponse = await axios.get(
        `https://api.github.com/installation/repositories`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );
      
      const repos = repoResponse.data.repositories.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        description: repo.description,
        updated_at: repo.updated_at,
        installation_id: installation.id,
        hasWebhook: true // GitHub Apps automatically receive webhooks
      }));
      
      allRepos = allRepos.concat(repos);
    }

    res.json(allRepos);
  } catch (error) {
    console.error("Failed to fetch repositories:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// ====================
// GitHub App Installation URL
// ====================
app.get("/github/install", (req, res) => {
  const installUrl = `https://github.com/apps/c-monitor/installations/new`;
  res.json({ installUrl });
});

// ====================
// Check Installation Status - Updated
// ====================
app.get("/github/installation/:username", async (req, res) => {
  const username = req.params.username;
  let installations = userInstallations.get(username) || [];
  
  // If no cached installations, try to get them fresh
  if (installations.length === 0) {
    try {
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

      installations = appInstallationsResponse.data.filter(
        installation => installation.account.login === username
      );
      
      if (installations.length > 0) {
        userInstallations.set(username, installations);
      }
    } catch (error) {
      console.error("Failed to get installations for status check:", error.response?.data || error.message);
    }
  }
  
  res.json({
    hasInstallation: installations.length > 0,
    installations: installations.map(inst => ({
      id: inst.id,
      target_type: inst.target_type,
      account: inst.account.login,
      repository_selection: inst.repository_selection,
      repositories_count: inst.repository_selection === 'all' ? 'all' : inst.repositories?.length || 0
    }))
  });
});

// ====================
// Webhook Handler (GitHub App)
// ====================
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const payload = req.body;

  if (!WEBHOOK_SECRET) {
    console.error("❌ WEBHOOK_SECRET not set in environment variables");
    return res.status(500).send("Server configuration error");
  }

  // Verify signature
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
    } else if (event === "installation_repositories") {
      handleInstallationRepositoriesEvent(body);
    }

    res.send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    res.status(400).send("Invalid JSON payload");
  }
});

// ====================
// Handle Installation Events
// ====================
function handleInstallationEvent(body) {
  const action = body.action;
  const installation = body.installation;
  
  console.log(`🔧 Installation ${action} for ${installation.account.login}`);
  
  if (action === "created") {
    console.log(`✅ GitHub App installed on ${installation.account.login}`);
    console.log(`   Repository access: ${installation.repository_selection}`);
    
    // Update cached installations
    const username = installation.account.login;
    const currentInstallations = userInstallations.get(username) || [];
    const updatedInstallations = [...currentInstallations, installation];
    userInstallations.set(username, updatedInstallations);
    
  } else if (action === "deleted") {
    console.log(`❌ GitHub App uninstalled from ${installation.account.login}`);
    installationTokens.delete(installation.id);
    
    // Remove from cached installations
    const username = installation.account.login;
    const currentInstallations = userInstallations.get(username) || [];
    const updatedInstallations = currentInstallations.filter(inst => inst.id !== installation.id);
    userInstallations.set(username, updatedInstallations);
  }
}

function handleInstallationRepositoriesEvent(body) {
  const action = body.action;
  const installation = body.installation;
  const repos = body.repositories_added || body.repositories_removed || [];
  
  console.log(`📁 Repositories ${action} for installation ${installation.id}`);
  repos.forEach(repo => {
    console.log(`   ${action === "added" ? "+" : "-"} ${repo.full_name}`);
  });
}

// ====================
// Pull Request Event Handler
// ====================
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
    console.log(`   Title: ${prTitle}`);
    console.log(`   Author: ${contributor}`);
    console.log(`   Changes: +${additions} -${deletions} files: ${filesChanged}`);
    console.log(`   Installation ID: ${installation.id}`);

    // Check if PR qualifies for reward
    if (additions >= 20 && filesChanged >= 2) {
      console.log(`🎉 REWARD: ${contributor} qualifies for reward!`);
      console.log(`   ✅ Additions: ${additions} (≥20)`);
      console.log(`   ✅ Files changed: ${filesChanged} (≥2)`);
      
      rewardContributor(contributor, {
        repository: repository.full_name,
        prNumber,
        additions,
        filesChanged,
        prTitle,
        installation_id: installation.id
      });
    } else {
      console.log(`⚠️ No reward: PR by ${contributor} doesn't meet criteria`);
      console.log(`   Additions: ${additions} (need ≥20)`);
      console.log(`   Files: ${filesChanged} (need ≥2)`);
    }
  } else if (action === "opened") {
    console.log(`📝 New PR #${pr.number} opened by ${pr.user.login} in ${repository.full_name}`);
  } else if (action === "synchronize") {
    console.log(`🔄 PR #${pr.number} updated by ${pr.user.login} in ${repository.full_name}`);
  }
}

// ====================
// Reward System
// ====================
function rewardContributor(username, prData) {
  console.log(`💰 Rewarding ${username} for PR #${prData.prNumber}`);
  
  const rewardAmount = calculateReward(prData.additions, prData.filesChanged);
  console.log(`   Reward amount: ${rewardAmount} points`);
  
  // Here you could:
  // 1. Call your reward API
  // 2. Update database
  // 3. Send notifications
  // 4. Create GitHub comment thanking contributor
  
  createThankYouComment(prData);
}

async function createThankYouComment(prData) {
  try {
    const token = await getInstallationToken(prData.installation_id);
    const [owner, repo] = prData.repository.split('/');
    
    const comment = `🎉 Thank you for your contribution! This PR qualifies for rewards:
- **Lines added**: ${prData.additions}
- **Files changed**: ${prData.filesChanged}
- **Reward points**: ${calculateReward(prData.additions, prData.filesChanged)}

Your contribution makes a difference! 🚀`;

    await axios.post(
      `https://api.github.com/repos/${prData.repository}/issues/${prData.prNumber}/comments`,
      { body: comment },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );
    
    console.log(`✅ Thank you comment posted to PR #${prData.prNumber}`);
  } catch (error) {
    console.error(`❌ Failed to post comment:`, error.response?.data || error.message);
  }
}

function calculateReward(additions, filesChanged) {
  const baseReward = 100;
  const additionBonus = Math.min(additions * 2, 500);
  const fileBonus = Math.min(filesChanged * 10, 200);
  
  return baseReward + additionBonus + fileBonus;
}

// ====================
// Health Check
// ====================
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "GitHub App Server Running",
    timestamp: new Date().toISOString(),
    app_id: GITHUB_APP_ID
  });
});

// ====================
// Error Handling
// ====================
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ====================
// Start Server
// ====================
app.listen(PORT, () => {
  console.log(`🚀 GitHub App Server started at http://localhost:${PORT}`);
  console.log(`📝 Environment check:`);
  console.log(`   GitHub App ID: ${GITHUB_APP_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GitHub Private Key: ${GITHUB_PRIVATE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GitHub Client ID: ${GITHUB_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Webhook Secret: ${WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Frontend URL: ${FRONTEND_URL || 'http://localhost:3001'}`);
});