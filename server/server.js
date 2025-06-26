const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();

const PORT = 3000;
const WEBHOOK_SECRET = "your_webhook_secret";

app.use(bodyParser.json());

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-hub-signature-256"];

  const payload = JSON.stringify(req.body);

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  if (signature !== digest) {
    return res.status(401).send("Unauthorized");
  }

  const event = req.headers["x-github-event"];

  if (event === "pull_request" && req.body.action === "closed" && req.body.pull_request.merged) {
    const pr = req.body.pull_request;
    const contributor = pr.user.login;
    const additions = pr.additions;
    
    const deletions = pr.deletions;
    const filesChanged = pr.changed_files;

    console.log("✅ Merged PR from:", contributor);
    console.log("➕ Additions:", additions);
    console.log("➖ Deletions:", deletions);
    console.log("📁 Files changed:", filesChanged);

    // You can add meaningfulness check here
    if (additions > 20 && filesChanged > 1) {
      console.log(`🎉 Valid contribution by ${contributor}, reward eligible`);
      // TODO: Trigger CDP wallet payment or notify
    } else {
      console.log(`⚠️ PR by ${contributor} was too small or only touched docs`);
    }
  }

  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
