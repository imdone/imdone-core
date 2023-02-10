const ReadStreamTaskParser = require('./ReadStreamTaskParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const HashStyleOrderMetaTaskParser = require('../task/HashStyleOrderMetaTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')
const CheckStyleTaskParser = require('../task/CheckStyleTaskParser')
const appContext = () => require('../../../context/ApplicationContext')

module.exports = class ReadStreamMarkdownParser extends ReadStreamTaskParser {
  constructor(readStream) {
    super(readStream)
    const { config } = appContext()
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
