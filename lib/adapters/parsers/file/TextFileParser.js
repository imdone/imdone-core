const FileParser = require('./FileParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const HashStyleOrderMetaTaskParser = require('../task/HashStyleOrderMetaTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')

// TODO:0 ## create ImdoneCodeFileParser
// #adapter
// [${source.path}](${source.path})

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
