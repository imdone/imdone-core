const ProjectReader = require('../../domain/usecases/ProjectReader')
const LocalFileParserFactory = require('../parsers/file/LocalFileParserFactory')

module.exports = class FileSystemProjectReader extends ProjectReader {
  read (projectPath) {
    // DOING:0 ## Load the config file
    // #adapter
    // [${source.path}](${source.path})

    // TODO:0 ## Parse project files
    // - Loop over the files in the filesystem
    // - Give each one a file parser and parse the file
    //   - `const parser = LocalFileParserFactory.getFileParser(filePath, config)`
    //   - Use worker_threads
    // #adapter
    // [${source.path}](${source.path})

  }
}