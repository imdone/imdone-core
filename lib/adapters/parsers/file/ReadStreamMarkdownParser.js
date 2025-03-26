import { ReadStreamTaskParser } from './ReadStreamTaskParser.js'
import { HashStyleTaskParser } from '../task/HashStyleTaskParser.js'
import { MarkdownStyleTaskParser } from '../task/MarkdownStyleTaskParser.js'
// const CheckStyleTaskParser = require('../task/CheckStyleTaskParser')

export class ReadStreamMarkdownParser extends ReadStreamTaskParser {
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
