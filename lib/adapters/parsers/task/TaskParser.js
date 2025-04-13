
class Task {
  constructor({ beforeText, text, list, line, order, checked, colon, type }) {
    this.contentLength = 0
    this.description = []
    this.beforeText = beforeText
    this.text = text
    this.list = list
    this.line = line
    this.order = order
    this.checked = checked
    this.colon = colon
    this.type = type
  }
}

export class TaskParser {
  constructor(type, config) {
    this.config = config
    this.type = type
  }

  get pattern() {
    throw new Error('Unimplemented')
  }

  parseLine(lineContent, line, task) {
    const re = new RegExp(this.pattern)
    const result = re.exec(lineContent)
    const parseResult = result && this.parse(lineContent, line, result, task)

    if (parseResult && this.config.lists && !this.config.listExists(parseResult.list)) {
      return
    }

    return parseResult && new Task(parseResult)
  }
}
