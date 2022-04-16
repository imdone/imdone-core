const ReadLine = require('readline')

module.exports = class FileParser {
  constructor(readStream) {
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

  // DOING:-50 ## For reading task in a loop
  async readTask() {
    let task
    let taskFoundOrDone = false
    this.blankLines = 0
    try {
      while (!taskFoundOrDone) {
        this.line = await this.readLine()
        let { value, done } = this.line
        if (this.line && !done) {
          this.lineNo++
          const endOfTask = this.isEndOfTask(value)
          if (task && endOfTask) {
            taskFoundOrDone = true
          } else if (task) {
            task.description.push(value)
          } else {
            task = this.getTaskFromLine(value)
          }
        } else {
          taskFoundOrDone = true
        }
      }
    } catch (error) {
      console.log('Error reading line')
      throw error
    }
    return task
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

  close() {
    this.readInterface.close()
    this.readStream.close()
  }
}
