import fs from "fs";
import dotenv from "dotenv";
import { verifyAll } from "./verify-lib";
dotenv.config();

/*
  CLI entry point to verify a file against an on‑chain record. Usage:
    ts-node verifier/src/verify.ts --rpc <RPC> --contract <ADDR> --token <ID> --file <PATH>
  If RPC is omitted, RPC_URL in .env will be used.
*/
(async () => {
  const args = require("minimist")(process.argv.slice(2));
  const rpc = args.rpc || process.env.RPC_URL;
  const contract = args.contract;
  const token = BigInt(args.token);
  const file = args.file;
  if (!contract || !token || !file) {
    console.error("Missing required arguments: --contract, --token, --file");
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  const res = await verifyAll({ contentBytes: buf, rpc, contractAddr: contract, tokenId: token });
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.ok ? 0 : 2);
})();