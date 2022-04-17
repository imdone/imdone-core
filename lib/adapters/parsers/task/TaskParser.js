const Config = require('../../../config')
const ApplicationContext = require('../../../context/ApplicationContext')

class Task {
  constructor({ text, list, line, order }) {
    this.contentLength = 0
    this.description = []
    this.text = text
    this.list = list
    this.line = line
    this.order = order
  }
}

module.exports = class TaskParser {
  constructor(type) {
    this.config = ApplicationContext.get(Config)
    this.type = type
  }

  get pattern() {
    throw new Error('Unimplemented')
  }

  parseLine(lineContent, line, task) {
    const re = new RegExp(this.pattern)
    const result = re.exec(lineContent)
    const parseResult = result && this.parse(lineContent, line, result, task)
    return parseResult && new Task(parseResult)
  }
}
