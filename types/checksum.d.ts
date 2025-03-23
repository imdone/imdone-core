/**
 * Compute a checksum for a given string or file.
 * @param {string} input - The string or file path to hash.
 * @param {string} algorithm - The hash algorithm to use (default: 'sha1').
 * @param {boolean} isFile - Whether the input is a file path.
 * @returns {Promise<string>} The computed checksum.
 */
export function computeChecksum(input: string, algorithm?: string, isFile?: boolean): Promise<string>;
