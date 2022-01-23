const TaskParser = require('./TaskParser')
const Task = require('../task')
const { createReadStream } = require('fs')

// TODO change to ImdoneTextFileParser
// also create ImdoneCodeFileParser

class TextFileTaskParser extends TaskParser {
  constructor (readStream, config) {
    super(readStream)
    this.taskTypes = [
      {
        pattern: HASH_STYLE_PATTERN,
        type: Task.Types.HASHTAG
      },
      {
        pattern: HASH_STYLE_META_ORDER_PATTERN,
        type: Task.Types.HASH_META_ORDER
      },
      {
        pattern: LINK_STYLE_PATTERN,
        type: Task.Types.MARKDOWN
      }
    ]
    if (config.isAddCheckBoxTasks()) this.taskTypes.push({
      pattern: CHECK_STYLE_PATTERN,
      type: Task.Types[config.getNewCardSyntax()]
    })
  }

  onLine (lineContent, lineNo) {
    
  }
}

module.exports = function newTaskParser (filePath, config) {
  return new TextFileTaskParser(createReadStream(filePath), config)
}