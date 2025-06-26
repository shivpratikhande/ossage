const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
require('dotenv').config();


const app = express();

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ;

// Middleware to capture raw body for signature verification
// app.use(bodyParser.json());

app.use('/webhook', express.raw({ type: 'application/json' }));


app.post("/webhook", (req, res) => {
  try {
    console.log("📥 Webhook received");
    console.log("Headers:", req.headers);
    
    const signature = req.headers["x-hub-signature-256"];
    
    if (!signature) {
      console.log("❌ No signature provided");
      return res.status(401).send("No signature provided");
    }

    // Use raw buffer for signature verification
    const payload = req.body;
    
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    const digest = "sha256=" + hmac.update(payload).digest("hex");

    console.log("🔐 Expected signature:", digest);
    console.log("🔐 Received signature:", signature);

    if (signature !== digest) {
      console.log("❌ Signature mismatch");
      return res.status(401).send("Unauthorized");
    }

    console.log("✅ Signature verified");

    // Parse the JSON after signature verification
    const body = JSON.parse(payload.toString());
    const event = req.headers["x-github-event"];

    console.log("📋 Event type:", event);
    console.log("📋 Action:", body.action);

    if (event === "pull_request") {
      console.log("🔄 Pull request event received");
      
      if (body.action === "closed" && body.pull_request && body.pull_request.merged) {
        const pr = body.pull_request;
        const contributor = pr.user.login;
        const additions = pr.additions || 0;
        const deletions = pr.deletions || 0;
        const filesChanged = pr.changed_files || 0;

        console.log("✅ Merged PR from:", contributor);
        console.log("➕ Additions:", additions);
        console.log("➖ Deletions:", deletions);
        console.log("📁 Files changed:", filesChanged);

        // Meaningfulness check
        if (additions > 20 && filesChanged > 1) {
          console.log(`🎉 Valid contribution by ${contributor}, reward eligible`);
          // TODO: Trigger CDP wallet payment or notify
          
          // You can add your reward logic here
          // await rewardContributor(contributor, additions, deletions, filesChanged);
          
        } else {
          console.log(`⚠️ PR by ${contributor} was too small (${additions} additions, ${filesChanged} files)`);
        }
      } else {
        console.log("ℹ️ PR event but not a merged PR:", body.action);
      }
    } else {
      console.log("ℹ️ Non-PR event:", event);
    }

    res.status(200).send("OK");
    
  } catch (error) {
    console.error("💥 Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Root endpoint for testing
app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "GitHub Webhook Server Running",
    endpoints: {
      webhook: "/webhook",
      health: "/health"
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
});