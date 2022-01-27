const FileParser = require('./FileParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const HashStyleOrderMetaTaskParser = require('../task/HashStyleOrderMetaTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')

// TODO change to ImdoneTextFileParser
// also create ImdoneCodeFileParser
// const HASH_STYLE_PATTERN  = /#([a-zA-Z-_]+?):(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm
// const HASH_STYLE_META_ORDER_PATTERN =  /#([a-zA-Z-_]+?)[ \t]+(.+)$/gm
// const LINK_STYLE_PATTERN = /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?\))/gm
// const CHECK_STYLE_PATTERN = /^(\s*- \[([x ])\]\s)(.+$)/gm

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
