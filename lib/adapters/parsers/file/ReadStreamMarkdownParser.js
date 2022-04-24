const ReadStreamTaskParser = require('./ReadStreamTaskParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const HashStyleOrderMetaTaskParser = require('../task/HashStyleOrderMetaTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')
const CheckStyleTaskParser = require('../task/CheckStyleTaskParser')
const Config = require('../../../config')
const ApplicationContext = require('../../../context/ApplicationContext')

module.exports = class ReadStreamMarkdownParser extends ReadStreamTaskParser {
  constructor(readStream) {
    super(readStream)
    const config = ApplicationContext.get(Config)
    this.taskParsers = [
      new HashStyleTaskParser(),
      new HashStyleOrderMetaTaskParser(),
      new MarkdownStyleTaskParser(),
    ]
    if (config.isAddCheckBoxTasks()) {
      this.taskParsers.push(new CheckStyleTaskParser())
    }
  }
}
