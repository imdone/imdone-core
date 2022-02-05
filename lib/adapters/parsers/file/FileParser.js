const ReadLine = require('readline')
const Emitter = require('events')

module.exports = class FileParser extends Emitter {
  constructor (readStream) {
    super()
    this.readStream = readStream
    this.task = null
    this.taskParsers = []
  }

  parse () {
    (async () => {
      try {
        const onError = (err) => this.emitError(err)
        this.readStream.on('error', onError)
    
        const readInterface = ReadLine.createInterface({
          input: this.readStream,
          crlfDelay: Infinity,
          console: false
        })
    
        readInterface.once('close', () => {
          this.readStream.off('error', onError)
          this.emit('close')
        });
    
        let lineNo = 0
        for await (const lineContent of readInterface) {
          lineNo++
          this.onLine(lineContent, lineNo)
        }
        this.onFileEnd()
      } catch (err) {
        this.emitError(err)
      }
    })()
  }

  getTask (lineContent, lineNo) {
    let task
    this.taskParsers.find(taskParser => {
      task = taskParser.parseLine(lineContent, lineNo)
      if (task) task.type = taskParser.type
      return task
    })
    return task
  }

  onLine (lineContent, lineNo) {
    const task = this.getTask(lineContent, lineNo)
    
    if (task) {
      task.contentLength += lineContent.length
    }
    
    if (this.isFirstTask(task)) {
      this.task = task
    } else if (this.isContentAfterCurrentTask(task)) {
      this.task.description.push(lineContent)
    } else if (this.isNewTask(task)) {
      this.emitTask(this.task)
      this.task = task
    }
  }

  isContentAfterCurrentTask (task) {
    return !task && this.task
  }

  isFirstTask (task) {
    return task && !this.task
  }

  isNewTask (task) {
    return task && this.task
  }

  onFileEnd () {
    if (this.task) this.emitTask(this.task)
    this.emit('done')
  }

  emitTask (task) {
    this.emit('task', task)
  }

  emitError (error) {
    this.emit('error', error)
  }

  emitDone () {
    this.emit('done')
  }
}