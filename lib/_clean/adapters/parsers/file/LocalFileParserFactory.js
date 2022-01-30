const { createReadStream } = require('fs')
const TextFileParser = require('./TextFileParser')

module.exports = {
  getFileParser (filePath, config) {
    // TODO: This is where we check the file extension and return the correct FileParser
    return new TextFileParser(createReadStream(filePath), config)
  }
}
