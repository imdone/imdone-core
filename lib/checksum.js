import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

/**
 * Compute a checksum for a given string or file.
 * @param {string} input - The string or file path to hash.
 * @param {string} algorithm - The hash algorithm to use (default: 'sha1').
 * @param {boolean} isFile - Whether the input is a file path.
 * @returns {Promise<string>} The computed checksum.
 */
export async function computeChecksum(input, algorithm = 'sha1', isFile = false) {
  const hash = createHash(algorithm);

  if (isFile) {
    const fileBuffer = await readFile(input);
    hash.update(fileBuffer);
  } else {
    hash.update(input);
  }

  return hash.digest('hex');
}
