const ReadLine = require('readline')
const blankLinesToEndTask = 2

module.exports = class ReadStreamTaskParser {
  constructor(readStream) {
    this.readStream = readStream
    this.task = null
    this.line = null
    this.taskParsers = []
    this.lineNo = 0
    this.blankLines = 0
    this.readInterface = ReadLine.createInterface({
      input: this.readStream,
      crlfDelay: Infinity,
      console: false,
    })
  }

  async readTask() {
    let taskOrStreamDone = false
    this.task = this.nextTask || null
    this.blankLines = 0

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
          }
        } else {
          taskOrStreamDone = true
        }
      }
    } catch (error) {
      console.log('Error reading line')
      throw error
    }

    this.trimLinesToEndTask()
    return this.task
  }

  async readLine() {
    return this.readInterface[Symbol.asyncIterator]().next()
  }

  isEndOfTask(line) {
    if (line.trim() === '') {
      this.blankLines++
    } else {
      this.blankLines = 0
    }

    this.nextTask = this.getTaskFromLine(line)
    
    if (this.blankLines > blankLinesToEndTask - 1) {
      this.nextTask = undefined
      return true
    }

    if (this.nextTask) {
      return true
    }

    return false
  }

  getTaskFromLine(line) {
    let task
    this.taskParsers.find((taskParser) => {
      task = taskParser.parseLine(line, this.lineNo, this.task)
      return task
    })
    return task
  }

  addLineToTask(line) {
    this.task.description.push(line)
    this.task.lastLine = this.lineNo
  }

  trimLinesToEndTask() {
    if (!this.task) return
    if (
      this.blankLines == blankLinesToEndTask
    ) {
      this.task.description.length = this.task.description.length - (this.blankLines - 1)
    } else if (this.nextTask){
      this.task.description.length = this.task.description.length - (this.blankLines + 1)
    } else {
      this.task.description.length = this.task.description.length - this.blankLines
    }

    this.task.lastLine = this.task.line + this.task.description.length - 1
  }

  close() {
    this.readInterface.close()
    if (this.readStream.close) this.readStream.close()
  }
}
