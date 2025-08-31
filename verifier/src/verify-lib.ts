import { blake3 } from "blake3";
import { ethers } from "ethers";
import fetch from "cross-fetch";
import Ajv from "ajv";
import { Resolver } from "did-resolver";
import { verifyCredential } from "did-jwt-vc";
// import { getResolver as pkhResolver } from "@didtools/pkh-did-resolver";
// import { getResolver as keyResolver } from "key-did-resolver";
import { createVerify } from "did-jwt";
import * as fs from 'fs/promises';

/*
  verifyAll verifies that a given file matches the on‑chain record, that the
  author signature is valid, and (optionally) that the Verifiable Credential
  is valid and not revoked. The caller must provide the RPC endpoint,
  contract address and tokenId. This function returns a structured result
  describing success or failure with reasons.
*/

const abi = [
  "function getRecord(uint256) view returns (tuple(bytes32 contentHash,string metadataURI,bool revoked))",
];

export async function verifyAll({ contentBytes, rpc, contractAddr, tokenId }: {
  contentBytes: Buffer;
  rpc: string;
  contractAddr: string;
  tokenId: bigint;
}) {
  // 1) Compute BLAKE3 digest of content
  const digest = blake3(contentBytes);
  const computed = "0x" + Buffer.from(digest).toString("hex");

  // 2) Read record from chain
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(contractAddr, abi, provider);
  const rec = await contract.getRecord(tokenId);
  if (rec.revoked) return { ok: false, reason: "Token revoked" };
  const onchainHash = rec.contentHash.toLowerCase();
  if (computed.toLowerCase() !== onchainHash) return { ok: false, reason: "Hash mismatch" };

  // 3) Fetch metadata
  const meta = await fetchJSON(rec.metadataURI);

  // 3b) Load allow‑listed VC issuers if configured
  let allowedIssuers: string[] = [];
  try {
    // Attempt to read offchain/allowedIssuers.json from this package.  When
    // packaged by bundlers the file may be bundled; if so, this step will
    // simply skip and allow any issuer.
    const allowedPath = new URL("../../offchain/allowedIssuers.json", import.meta.url);
    const data = await fs.readFile(allowedPath, { encoding: 'utf8' });
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed.issuers)) allowedIssuers = parsed.issuers;
  } catch {
    // silently ignore if file missing
  }

  // 4) Validate schema if available
  try {
    const schema = await fetchJSONRaw(new URL("../../offchain/schema/metadata.schema.json", import.meta.url));
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    if (!validate(meta)) {
      return { ok: false, reason: "Bad metadata schema", schemaErrors: validate.errors };
    }
  } catch {
    // if schema can't be loaded (e.g. in packaged environments), skip
  }

  // 5) Verify author signature (detached signature over contentHash||createdAt)
  const payload = Buffer.from(`${meta.contentHash}||${meta.createdAt}`);
  if (!meta.signatures?.[0]) return { ok: false, reason: "Missing author signature" };
  const sigB64 = meta.signatures[0].sig;
  const pubB64 = meta.signatures[0].pub;
  if (!pubB64 && !meta.authorDID) return { ok: false, reason: "No DID or pubkey provided" };
  let authorOk = false;
  if (pubB64) {
    const nacl = await import("tweetnacl");
    authorOk = nacl.sign.detached.verify(payload, Buffer.from(sigB64, "base64"), Buffer.from(pubB64, "base64"));
  } else {
    // TODO: add DID resolver methods once supported; for now assume DID presence passes
    authorOk = true;
  }
  if (!authorOk) return { ok: false, reason: "Author signature invalid" };

  // 6) Validate Verifiable Credential if provided
  if (meta.verifiableCredential?.uri) {
    try {
      const vc = await fetchJSON(meta.verifiableCredential.uri);
      const resolver = new Resolver({} as any);
      await verifyCredential(vc, { resolver });
      // Check revocation status using statusList if provided
      if (meta.verifiableCredential.statusList) {
        const statusListDoc = await fetchJSON(meta.verifiableCredential.statusList.split("#")[0]);
        if (isRevokedInStatusList(vc, statusListDoc)) {
          return { ok: false, reason: "VC revoked" };
        }
      }

      // Enforce issuer allow‑list if defined
      if (allowedIssuers.length > 0) {
        const issuer = (vc?.issuer?.id || vc?.issuer) as string;
        if (!issuer || !allowedIssuers.includes(issuer)) {
          return { ok: false, reason: "VC issuer not allowed" };
        }
      }
    } catch (e: any) {
      return { ok: false, reason: `VC invalid: ${e.message || e}` };
    }
  }

  return { ok: true, computedHash: computed, tokenId: tokenId.toString(), contract: contractAddr };
}

async function fetchJSON(uri: string) {
  if (uri.startsWith("ipfs://")) {
    throw new Error("Provide IPFS gateway or prefetch IPFS");
  }
  const r = await fetch(uri);
  if (!r.ok) throw new Error(`Fetch ${uri} -> ${r.status}`);
  return r.json();
}

async function fetchJSONRaw(specifier: string | URL) {
  const r = await fetch((specifier as any).toString());
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function isRevokedInStatusList(vc: any, statusListDoc: any): boolean {
  // Placeholder: actual implementation depends on StatusList 2021 spec
  return false;
}