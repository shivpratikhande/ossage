// import { CdpClient } from "@coinbase/cdp-sdk";
// import dotenv from "dotenv";

// dotenv.config();

// const cdp = new CdpClient();

// // const account = await cdp.solana.createAccount();

// const { signature } = await cdp.solana.requestFaucet({
//   address: "532AY6h9d5qEHBYenLTq51yF994kUFcGMdmQ4x9bGinu",
//   token: "sol"
// });
// console.log(`Requested funds from Solana faucet: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

// faucetRequester.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const cdp = new CdpClient();

/**
 * Request funds from the Solana faucet
 * @param address - The Solana address to receive tokens
 * @param token - The token type (e.g., "sol")
 * @returns The faucet transaction signature
 */
export async function requestSolanaFaucet(  ) {
  try {
    const { signature } = await cdp.solana.requestFaucet({ address:"EGLR29r1kKMtasDzP8JHd2RABB1DMqya1dU1i2eJmb1G", token: "sol" });
    console.log(`✅ Requested funds from Solana faucet: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return signature;
  } catch (error) {
    console.error("❌ Failed to request faucet:", error);
    throw error;
  }
}
