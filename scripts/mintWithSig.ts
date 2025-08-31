import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// Domain values must match the deployed contract's name, version and chainId
const DOMAIN_NAME = "Provenance721";
const DOMAIN_VERSION = "1";

// Minimal ABI containing only the functions we need
const abi = [
  "function mintWithSig((bytes32 contentHash,string metadataURI,address to,address author,uint256 nonce,uint256 deadline) req, bytes signature) returns (uint256)",
  "function getRecord(uint256) view returns (tuple(bytes32 contentHash,string metadataURI,bool revoked))",
];

// Entry point: parse CLI args and submit a signed mint request
async function main() {
  const args = require("minimist")(process.argv.slice(2));
  const rpc = args.rpc || process.env.RPC_URL;
  const contractAddr = args.contract;
  const to = args.to;
  const author = args.author;
  const contentHash = args.hash;
  const metadataURI = args.meta;
  const nonce = Number(args.nonce || 0);
  const deadline = Math.floor(Date.now() / 1000) + 3600; // default 1h

  if (!rpc || !contractAddr || !to || !author || !contentHash || !metadataURI) {
    console.error(
      "Usage: ts-node scripts/mintWithSig.ts --rpc <RPC> --contract <ADDR> --to <ADDR> --author <ADDR> --hash <0x..> --meta <URI> [--nonce N]"
    );
    process.exit(1);
  }

  // Setup provider and signer
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider); // relayer
  const contract = new ethers.Contract(contractAddr, abi, signer);

  const net = await provider.getNetwork();
  const chainId = Number(net.chainId);
  const domain = { name: DOMAIN_NAME, version: DOMAIN_VERSION, chainId, verifyingContract: contractAddr };
  const types = {
    MintRequest: [
      { name: "contentHash", type: "bytes32" },
      { name: "metadataURI", type: "string" },
      { name: "to", type: "address" },
      { name: "author", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const message = { contentHash, metadataURI, to, author, nonce, deadline };

  // Author must sign the typed data; for demo we load from AUTHOR_KEY env var
  const authorSigner = new ethers.Wallet(process.env.AUTHOR_KEY!);
  const signature = await authorSigner._signTypedData(domain, types, message);

  const tx = await contract.mintWithSig(message, signature);
  const receipt = await tx.wait();
  console.log("Minted in tx:", receipt.transactionHash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});