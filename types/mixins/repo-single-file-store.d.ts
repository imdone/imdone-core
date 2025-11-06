/**
 * Creates a mixin that extends the file system store to only load a single specified file
 * @param {Object} repo - The repository instance
 * @param {string} targetFilePath - The absolute path of the file to load
 * @param {Object} fs - File system instance (optional)
 * @returns {Object} The repository with single file functionality
 */
export function singleFileStoreMixin(repo: Object, targetFilePath: string, fs: Object): Object;
