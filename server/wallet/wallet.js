// createSolanaAccount.js

const { CdpClient } = require("@coinbase/cdp-sdk");
const dotenv = require("dotenv");

dotenv.config();

const cdp = new CdpClient();

/**
 * Creates a new Solana account using the Coinbase CDP SDK
 * @returns {Promise<string>} The created account address
 */
async function createSolanaAccount() {
  try {
    const account = await cdp.solana.createAccount();
    console.log(`✅ Created Solana account: ${account.address}`);
    return account.address;
  } catch (error) {
    console.error("🚨 Error creating Solana account:", error);
    throw error;
  }
}

module.exports = {
  createSolanaAccount,
};
