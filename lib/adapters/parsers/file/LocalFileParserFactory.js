const { createReadStream } = require('fs')
const TextFileParser = require('./TextFileParser')

module.exports = {
  getFileParser(filePath) {
    // BACKLOG:-860 ## This is where we check the file extension and return the correct FileParser
    // #adapter
    // [${source.path}](${source.path})
    // <!-- epic:"Release 2.0" -->
    return new TextFileParser(createReadStream(filePath))
  },
}
