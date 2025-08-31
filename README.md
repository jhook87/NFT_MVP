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

### IPFS Pinning

NFTStop uploads media and metadata off‑chain to IPFS.  A helper script is provided to pin files using [Web3.Storage](https://web3.storage/).  To use it:

1. Sign up for an API token at web3.storage and set `WEB3_STORAGE_TOKEN` in your `.env` file.
2. Run the pin script:

```bash
npx ts-node scripts/pin.ts ./path/to/file
```

The script uploads the file and prints an `ipfs://...` URI.  Use this URI as the `metadataURI` when minting.

### Allowed VC Issuers

The verifier can enforce that Verifiable Credentials come from a trusted set of issuers.  To configure the allow‑list, edit `offchain/allowedIssuers.json` and include the DIDs of issuers you trust:

```json
{
  "issuers": [
    "did:example:trustedIssuer1",
    "did:example:trustedIssuer2"
  ]
}
```

When verifying, if a VC is present and its issuer is not in the list, the verifier returns `VC issuer not allowed`.  If the file is absent or the file cannot be loaded the verifier allows any issuer by default.

## Quick start

... omitted for brevity ...

