import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const cdp = new CdpClient();
const connection = new Connection("https://api.devnet.solana.com");

const senderAddress = "AeDZDyX4pc4Pcr8SspWzYYpeLQahy1cqkdGmRVzTXvbs";
const recipientAddress = "532AY6h9d5qEHBYenLTq51yF994kUFcGMdmQ4x9bGinu";

async function sendTransaction(fromAddr) {
  const fromPublicKey = new PublicKey(fromAddr);
  const toPublicKey = new PublicKey(recipientAddress);

  // Check balances before sending
  const senderBalance = await connection.getBalance(fromPublicKey);
  const recipientBalance = await connection.getBalance(toPublicKey);

  console.log(`Sender balance: ${senderBalance} lamports`);
  console.log(`Recipient balance: ${recipientBalance} lamports`);

 const lamportsToSend = 2_100; 

if (senderBalance < lamportsToSend) {
  throw new Error("Sender has insufficient balance to send this amount");
}


  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports: lamportsToSend,
    })
  );

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPublicKey;

  const serializedTx = Buffer.from(
    transaction.serialize({ requireAllSignatures: false })
  ).toString("base64");

  const { signature: txSignature } = await cdp.solana.signTransaction({
    address: fromAddr,
    transaction: serializedTx,
  });

  const decodedSignedTx = Buffer.from(txSignature, "base64");

  console.log("Sending transaction...");
  const txSendSignature = await connection.sendRawTransaction(decodedSignedTx);

  const latestBlockhash = await connection.getLatestBlockhash();

  console.log("Waiting for transaction to be confirmed...");
  const confirmation = await connection.confirmTransaction({
    signature: txSendSignature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
  }

  console.log(`✅ Transaction successful! View on explorer:`);
  console.log(`https://explorer.solana.com/tx/${txSendSignature}?cluster=devnet`);
}

async function main() {
  try {
    await sendTransaction(senderAddress);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}

main();
