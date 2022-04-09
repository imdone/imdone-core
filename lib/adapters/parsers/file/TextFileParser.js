const FileParser = require('./FileParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const HashStyleOrderMetaTaskParser = require('../task/HashStyleOrderMetaTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')

// BACKLOG:-870 ## create ImdoneCodeFileParser
// #adapter
// [${source.path}](${source.path})
// <!-- epic:"Release 2.0" -->

module.exports = class TextFileParser extends FileParser {
  constructor (readStream, config) {
    super(readStream)
    this.config = config
    this.taskParsers = [
      new HashStyleTaskParser(),
      new HashStyleOrderMetaTaskParser(),
      new MarkdownStyleTaskParser()
    ]
  }
}
