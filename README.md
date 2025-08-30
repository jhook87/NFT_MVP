# Content Authenticity MVP

This is a minimal implementation of a **content-hash-as-NFT** provenance system:

- Users create content; the app computes a hash (BLAKE3) and signs it.
- A smart contract mints an ERC-721 token that stores the canonical **contentHash** and a pointer to metadata (IPFS/Arweave).
- A verifier (Node/TS) recomputes the hash from supplied bytes, checks on-chain record, and inspects metadata.
- An Express server exposes `/verify` for easy integration.

> NOTE: This is a starter repo. It uses OpenZeppelin and common npm packages; run `npm i` in each package as needed. You will need RPC credentials for a testnet/L2 in `.env`.

## Layout
- `contracts/Provenance721.sol` — ERC-721 with content-hash uniqueness and EIP-712 **mintWithSig** flow
- `scripts/deploy.ts` — Hardhat deploy script
- `verifier/src/verify.ts` — CLI/API verifier
- `server/src/index.ts` — Express wrapper providing `/verify`
- `offchain/schema/metadata.schema.json` — JSON Schema for NFT metadata
- `sample/` — sample content and metadata

## Quick start

... omitted for brevity ...

