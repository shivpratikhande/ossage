import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const cdp = new CdpClient();

// const account = await cdp.solana.createAccount();

const { signature } = await cdp.solana.requestFaucet({
  address: "532AY6h9d5qEHBYenLTq51yF994kUFcGMdmQ4x9bGinu",
  token: "sol"
});
console.log(`Requested funds from Solana faucet: https://explorer.solana.com/tx/${signature}?cluster=devnet`);