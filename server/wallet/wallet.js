import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const cdp = new CdpClient();
const account = await cdp.evm.createAccount();
console.log(`Created EVM account: ${account.address}`);