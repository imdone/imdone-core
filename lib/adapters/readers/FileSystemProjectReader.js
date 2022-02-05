const fs = require('fs/promises')
const path = require('path')
const ProjectReader = require('../../domain/usecases/ProjectReader')
const LocalFileParserFactory = require('../parsers/file/LocalFileParserFactory')

module.exports = class FileSystemProjectReader extends ProjectReader {
  async read (projectPath) {
    // TODO:-10 ## Load the config file
    // #adapter
    // [${source.path}](${source.path})
    const files = await this.getFilesFromDirectory(projectPath)

    // TODO:0 ## Parse project files
    // - Loop over the files in the filesystem
    // - Give each one a file parser and parse the file
    //   - `const parser = LocalFileParserFactory.getFileParser(filePath, config)`
    //   - Use worker_threads
    // - After tasks are parsed trim the description appropriately and look for Check style tasks in what's left of the description
    // #adapter
    // [${source.path}](${source.path})

  }

  async getFilesFromDirectory (directoryPath) {
    const filesInDirectory = await fs.readdir(directoryPath)
    const files = await Promise.all(
        filesInDirectory.map(async (file) => {
            const filePath = path.join(directoryPath, file)
            const stats = await fs.stat(filePath)
            
            if (stats.isDirectory()) {
                return this.getFilesFromDirectory(filePath)
            } else {
                return filePath
            }
        })
    )
    return files.filter((file) => file.length)
  }
}