const ReadLine = require('readline')
const Emitter = require('events')

module.exports = class TaskParser extends Emitter {
  constructor (readStream) {
    super()
    this.readStream = readStream
  }

  readLines () {
    try {
      const onError = (err) => this.emitError(err)
      this.readStream.on('error', onError)
  
      const readInterface = ReadLine.createInterface({
        input: readStream,
        crlfDelay: Infinity,
        console: false
      })
  
      readInterface.once('close', () => {
        this.readStream.off('error', onError)
        this.emit('close')
      });
  
      let lineNo = 0
      for (lineContent of readInterface) {
        lineNo++
        this.onLine(lineContent, lineNo)
      }
    } catch (err) {
      this.emitError(err)
    }
  }

  onLine (lineContent, lineNo) {
    throw new Error(`onLine must be implemented by the subclass. lineNo:${lineNo} lineContent: ${lineContent}`)
  }

  emitTask (task) {
    this.emit('task', task)
  }

  emitError (error) {
    this.emit('error', error)
  }
}