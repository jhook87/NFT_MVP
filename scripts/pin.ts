import { storeFile } from '../utils/ipfs';

/*
 * Command‑line helper to upload a file to IPFS using Web3.Storage.
 *
 * Usage:
 *   ts-node scripts/pin.ts ./path/to/file
 *
 * The script reads the WEB3_STORAGE_TOKEN environment variable for
 * authentication.  See utils/ipfs.ts for implementation details.
 */
(async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ts-node pin.ts <filePath>');
    process.exit(1);
  }
  try {
    const uri = await storeFile(filePath);
    console.log(`Pinned ${filePath} -> ${uri}`);
  } catch (err: any) {
    console.error('IPFS pinning failed:', err?.message || err);
    process.exit(1);
  }
})();