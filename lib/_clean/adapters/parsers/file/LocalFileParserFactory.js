const { createReadStream } = require('fs')
const TextFileParser = require('./TextFileParser')

module.exports = {
  getFileParser (filePath, config) {
    // TODO:0 ## This is where we check the file extension and return the correct FileParser
    // #adapter
    // [${source.path}](${source.path})
    return new TextFileParser(createReadStream(filePath), config)
  }
}
