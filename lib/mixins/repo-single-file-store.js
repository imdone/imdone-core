import { fileSystemStoreMixin } from './repo-fs-store.js'
import _path from 'path'
import { File } from '../file.js'
import { lstat } from '../adapters/file-gateway.js'

/**
 * Creates a mixin that extends the file system store to only load a single specified file
 * @param {Object} repo - The repository instance
 * @param {string} targetFilePath - The absolute path of the file to load
 * @param {Object} fs - File system instance (optional)
 * @returns {Object} The repository with single file functionality
 */
export function singleFileStoreMixin(repo, targetFilePath, fs) {

  // Apply the base file system store mixin first
  repo = fileSystemStoreMixin(repo, fs)
  
  // Store the target file path as a relative path
  const targetRelativePath = repo.getRelativePath(targetFilePath)
  
  repo.getFilesInPath = async function (includeDirs) {
    const stat = await lstat(targetFilePath)

    if (!stat) {
        throw new Error(`File not found: ${targetFilePath}`)
    }
    // Create and return only the target file
    const file = new File({
      project: repo.project,
      repoId: repo.getId(),
      filePath: targetRelativePath,
      modifiedTime: stat.mtime,
      createdTime: stat.birthtime,
      size: stat.size
    })
    
    return [file]
  }
  
  return repo
}