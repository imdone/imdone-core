const ReadStreamTaskParser = require('./ReadStreamTaskParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')
// const CheckStyleTaskParser = require('../task/CheckStyleTaskParser')

module.exports = class ReadStreamMarkdownParser extends ReadStreamTaskParser {
  constructor(readStream, config) {
    super(readStream, config)
    this.taskParsers = [
      new HashStyleTaskParser(config),
      new MarkdownStyleTaskParser(config),
    ]
    // if (config.isAddCheckBoxTasks()) {
    //   this.taskParsers.push(new CheckStyleTaskParser())
    // }
  }
}
