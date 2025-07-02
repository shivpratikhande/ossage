const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Environment variables
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

// In-memory storage for tokens and installations
const installationTokens = new Map();
const userInstallations = new Map();

// Helper functions
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

// Routes
router.get("/connect", (req, res) => {
  const redirect = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email,read:org`;
  res.redirect(redirect);
});

router.get("/callback", async (req, res) => {
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

router.get("/repos/:username", async (req, res) => {
  const username = req.params.username;
  const solanaService = req.app.locals.solanaService;
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

// Export functions that webhook handler needs
module.exports = {
  router,
  installationTokens,
  userInstallations,
  getInstallationToken
};