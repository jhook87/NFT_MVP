import { Web3Storage, File } from 'web3.storage';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

/**
 * Return the Web3.Storage API token from environment variables.
 */
function getAccessToken(): string {
  return process.env.WEB3_STORAGE_TOKEN || '';
}

/**
 * Store a file on IPFS via Web3.Storage.
 *
 * This helper wraps the web3.storage client and uploads the given file.  It returns
 * an ipfs URI (e.g. ipfs://<cid>) that can be stored in your NFT metadata.  Note
 * that you must set the `WEB3_STORAGE_TOKEN` environment variable with a valid
 * API token from web3.storage.  See https://web3.storage/docs/how-tos/store/
 * for details on obtaining a token.
 *
 * @param filePath Path to the file to upload.
 * @returns The ipfs URI for the stored file.
 */
export async function storeFile(filePath: string): Promise<string> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('WEB3_STORAGE_TOKEN environment variable is not set');
  }
  const storage = new Web3Storage({ token });
  const content = await fs.promises.readFile(filePath);
  const file = new File([content], path.basename(filePath));
  // Wrap withDirectory: false so the returned CID points directly to the file
  const cid = await storage.put([file], { wrapWithDirectory: false });
  return `ipfs://${cid}`;
}