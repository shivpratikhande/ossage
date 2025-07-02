// routes/wallet.js
const express = require("express");
const router = express.Router();

// Create wallet for repository
router.post("/create/:repoFullName", async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    const solanaService = req.app.locals.solanaService;
    
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

// Get wallet info for repository
router.get("/:repoFullName", async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    const solanaService = req.app.locals.solanaService;
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

// Fund wallet from faucet
router.post("/fund/:repoFullName", async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    const solanaService = req.app.locals.solanaService;
    const result = await solanaService.fundWalletFromFaucet(repoFullName);
    res.json(result);
  } catch (error) {
    console.error("Failed to fund wallet:", error.message);
    res.status(500).json({ error: "Failed to fund wallet" });
  }
});

module.exports = router;

// routes/contributor.js - Separate file
const express = require("express");
const { PublicKey } = require("@solana/web3.js");
const contributorRouter = express.Router();

// Register contributor with Solana address
contributorRouter.post("/register", async (req, res) => {
  try {
    const { username, solanaAddress } = req.body;
    const solanaService = req.app.locals.solanaService;
    
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

// Get contributor info
contributorRouter.get("/:username", (req, res) => {
  const username = req.params.username;
  const solanaService = req.app.locals.solanaService;
  const solanaAddress = solanaService.getContributorAddress(username);
  
  if (!solanaAddress) {
    return res.status(404).json({ error: "Contributor not registered" });
  }
  
  res.json({ username, solanaAddress });
});

module.exports = { 
  walletRouter: router,
  contributorRouter 
};