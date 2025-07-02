const express = require("express");
const cors = require("cors");
const { Connection } = require("@solana/web3.js");
const SolanaService = require('./services/solana-service');
const githubRoutes = require('./routes/github');
const walletRoutes = require('./routes/wallet');
const contributorRoutes = require('./routes/contributor');
const webhookHandler = require('./handlers/webhook');
require("dotenv").config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

const solanaConnection = new Connection("https://api.devnet.solana.com");
const solanaService = new SolanaService(solanaConnection);

app.locals.solanaService = solanaService;


app.use('/github', githubRoutes);
app.use('/wallet', walletRoutes);
app.use('/contributor', contributorRoutes);
app.post('/webhook', webhookHandler);

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

module.exports = app;