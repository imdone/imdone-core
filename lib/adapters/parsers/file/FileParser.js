const ApplicationContext = require('../../../context/ApplicationContext')
const Config = require('../../../config')
const ReadLine = require('readline')
const START_TAG = '<card>'
const END_TAG = '</card>'

module.exports = class FileParser {
  constructor(readStream) {
    this.config = ApplicationContext.get(Config)
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
    this.blankLinesToEndTask = this.config.blankLinesToEndTask
  }

  async readTask() {
    let taskOrStreamDone = false
    this.task = null
    this.blankLines = 0
    this.hasStartTag = false

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

    this.trimBlankLinesToEndTask()
    return this.task
  }

  async readLine() {
    return this.readInterface[Symbol.asyncIterator]().next()
  }

  isEndOfTask(line) {
    if (this.task && this.task.hasCardTags) return true
    if (this.hasStartTag) return false

    if (line.trim() === '') {
      this.blankLines++
    } else {
      this.blankLines = 0
    }

    return (
      this.getTaskFromLine(this.line.value) ||
      this.blankLines > this.blankLinesToEndTask - 1
    )
  }

  getTaskFromLine(line) {
    let task
    this.taskParsers.find((taskParser) => {
      task = taskParser.parseLine(line, this.lineNo, this.task)
      if (task) {
        task.type = taskParser.type
        task.line = this.lineNo
      }
      return task
    })
    return task
  }

  addLineToTask(line) {
    if (line.trim() === START_TAG && this.task.description.length == 0) {
      this.hasStartTag = true
    } else if (line.trim() === END_TAG && this.hasStartTag) {
      this.task.hasCardTags = true
    } else {
      this.task.description.push(line)
    }

    this.task.lastLine = this.lineNo
  }

  trimBlankLinesToEndTask() {
    if (!this.task) return
    if (
      this.blankLines == this.blankLinesToEndTask &&
      this.blankLinesToEndTask > 1 &&
      !this.task.hasCardTags
    ) {
      this.task.description.splice(
        this.task.description.length - this.blankLines + 1,
        this.blankLinesToEndTask - 1
      )
      this.task.lastLine = this.task.lastLine - this.blankLines
    }
  }

  close() {
    this.readInterface.close()
    this.readStream.close()
  }
}
