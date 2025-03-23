import { ReadStreamTaskParser } from './ReadStreamTaskParser'
import { HashStyleTaskParser } from '../task/HashStyleTaskParser'
import { MarkdownStyleTaskParser } from '../task/MarkdownStyleTaskParser'
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
