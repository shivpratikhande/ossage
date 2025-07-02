const crypto = require("crypto");
const { userInstallations } = require("../routes/github");

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

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
    const { installationTokens } = require("../routes/github");
    installationTokens.delete(installation.id);
  }
}

function handlePullRequestEvent(body, solanaService) {
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
      }, solanaService);
    }
  }
}

async function rewardContributor(username, prData, solanaService) {
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
  
  // Uncomment if you want to create thank you comments
  // await createThankYouComment(prData, walletInfo, contributorAddress, rewardSent, rewardSol);
}

function calculateReward(additions, filesChanged) {
  const baseReward = 100;
  const additionBonus = Math.min(additions * 2, 500);
  const fileBonus = Math.min(filesChanged * 10, 200);
  
  return baseReward + additionBonus + fileBonus;
}

// Main webhook handler function
function webhookHandler(req, res) {
  const signature = req.headers["x-hub-signature-256"];
  const payload = req.body;
  const solanaService = req.app.locals.solanaService;

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
      handlePullRequestEvent(body, solanaService);
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
}

module.exports = webhookHandler;