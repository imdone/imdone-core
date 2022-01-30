const Emitter = require('events')

class Task {
  constructor ({text, list, line, order}) {
    this.contentLength = 0
    this.description = []
    this.text = text
    this.list = list
    this.line = line
    this.order = order
  }
}

module.exports = class TaskParser extends Emitter {

  constructor (type) {
    super()
    this.type = type
  }

  get pattern () {
    throw new Error('Unimplemented')
  }

  parseLine (lineContent, line) {
    const re = new RegExp(this.pattern)
    const result = re.exec(lineContent)
    return result ? new Task(this.parse(lineContent, line, result)) : null
  }

}