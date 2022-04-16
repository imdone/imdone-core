const ReadLine = require('readline')
const START_TAG = '<card>'
const END_TAG = '</card>'

module.exports = class FileParser {
  constructor(readStream, config) {
    this.config = config
    this.readStream = readStream
    this.readInterface = ReadLine.createInterface({
      input: this.readStream,
      crlfDelay: Infinity,
      console: false,
    })
    this.task = null
    this.line = null
    this.taskParsers = []
    this.lineNo = 0
    this.blankLines = 0
  }

  async readTask() {
    let taskOrStreamDone = false
    this.task = null
    this.blankLines = 0
    this.hasStartTag = false
    this.preserveBlankLines = false

    try {
      while (!taskOrStreamDone) {
        this.line = await this.readLine()
        let { value, done } = this.line
        if (this.line && !done) {
          this.lineNo++
          const endOfTask = this.isEndOfTask(value)
          if (this.task && endOfTask) {
            taskOrStreamDone = true
          } else if (this.task) {
            this.addLineToTask(value)
          } else {
            this.task = this.getTaskFromLine(value)
            this.setLineOnTask()
          }
        } else {
          taskOrStreamDone = true
        }
      }
    } catch (error) {
      console.log('Error reading line')
      throw error
    }

    this.setLastLineOnTask()
    return this.task
  }

  async readLine() {
    return this.readInterface[Symbol.asyncIterator]().next()
  }

  isEndOfTask(line) {
    if (this.preserveBlankLines) return true

    if (line.trim() === '') {
      this.blankLines++
    } else {
      this.blankLines = 0
    }
    return this.getTaskFromLine(this.line.value) || this.blankLines > 0
  }

  getTaskFromLine(line) {
    let task
    this.taskParsers.find((taskParser) => {
      task = taskParser.parseLine(line, this.lineNo)
      if (task) task.type = taskParser.type
      return task
    })
    return task
  }

  addLineToTask(line) {
    if (!this.task) return

    if (line.trim() === START_TAG && this.task.description.length == 0) {
      this.hasStartTag = true
    } else if (line.trim() === END_TAG && this.hasStartTag) {
      this.task.preserveBlankLines = this.preserveBlankLines = true
    } else {
      this.task.description.push(line)
    }
  }

  setLineOnTask() {
    if (!this.task) return
    this.task.line = this.lineNo
  }

  setLastLineOnTask() {
    if (!this.task) return
    this.task.lastLine = this.lineNo
  }

  close() {
    this.readInterface.close()
    this.readStream.close()
  }
}
