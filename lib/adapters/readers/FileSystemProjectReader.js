const fs = require('fs/promises')
const path = require('path')
const LocalFileParserFactory = require('../parsers/file/LocalFileParserFactory')

module.exports = class FileSystemProjectReader {
  async read (projectPath) {
    // BACKLOG:-890 ## Load the config file
    // #adapter
    // [${source.path}](${source.path})
    // <!-- epic:"Release 2.0" -->
    const files = await this.getFilesFromDirectory(projectPath)

    // BACKLOG:-780 ## Parse project files
    // - Loop over the files in the filesystem
    // - Give each one a file parser and parse the file
    //   - `const parser = LocalFileParserFactory.getFileParser(filePath, config)`
    //   - Use worker_threads
    // - After tasks are parsed trim the description appropriately and look for Check style tasks in what's left of the description
    // #adapter
    // [${source.path}](${source.path})
    // <!-- epic:"Release 2.0" -->

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