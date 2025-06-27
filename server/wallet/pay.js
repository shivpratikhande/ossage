// sendSolanaTransaction.js

const {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} = require("@solana/web3.js");
const { CdpClient } = require("@coinbase/cdp-sdk");
const dotenv = require("dotenv");

dotenv.config();

const cdp = new CdpClient();
const connection = new Connection("https://api.devnet.solana.com");

const fromAddress = "AeDZDyX4pc4Pcr8SspWzYYpeLQahy1cqkdGmRVzTXvbs";
const toAddress = "532AY6h9d5qEHBYenLTq51yF994kUFcGMdmQ4x9bGinu";


/**
 * Sends SOL from a Coinbase-managed wallet to another address.
 * @param {string} fromAddress - The sender's public address
 * @param {string} toAddress - The recipient's public address
 * @param {number} lamportsToSend - Amount of lamports to send (default: 2100)
 * @returns {Promise<string>} Transaction signature
 */
async function sendSolanaTransaction(fromAddress, toAddress, lamportsToSend = 40000000) {
  try {
    const fromPubKey = new PublicKey(fromAddress);
    const toPubKey = new PublicKey(toAddress);

    const senderBalance = await connection.getBalance(fromPubKey);
    const recipientBalance = await connection.getBalance(toPubKey);

    console.log(`Sender balance: ${senderBalance} lamports`);
    console.log(`Recipient balance: ${recipientBalance} lamports`);

    if (senderBalance < lamportsToSend) {
      throw new Error("❌ Sender has insufficient balance.");
    }

    const { blockhash } = await connection.getLatestBlockhash();

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPubKey,
        toPubkey: toPubKey,
        lamports: lamportsToSend,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubKey;

    const serializedTx = transaction.serialize({ requireAllSignatures: false });
    const base64Tx = serializedTx.toString("base64");

    const { signature: signedTx } = await cdp.solana.signTransaction({
      address: fromAddress,
      transaction: base64Tx,
    });

    const decodedSignedTx = Buffer.from(signedTx, "base64");

    console.log("Sending transaction...");
    const txSignature = await connection.sendRawTransaction(decodedSignedTx);

    const latestBlockhash = await connection.getLatestBlockhash();

    console.log("Waiting for confirmation...");
    const confirmation = await connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log(`✅ Transaction successful!`);
    console.log(`🔗 https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

    return txSignature;

  } catch (error) {
    console.error("🚨 Error in sendSolanaTransaction:", error);
    throw error;
  }
}

module.exports = {
  sendSolanaTransaction,
};

// sendSolanaTransaction("F9Sizvm5evmpWN6skqwmFo2UHKBiY6fTBdWtRuFwxQFR","532AY6h9d5qEHBYenLTq51yF994kUFcGMdmQ4x9bGinu")