import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const cdp = new CdpClient();       
const account = await cdp.solana.createAccount();
console.log(`Created Solana account: ${account.address}`);