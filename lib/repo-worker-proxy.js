const Emitter = require('events')
const {fork} = require('child_process')
const File = require('./file')
const Task = require('./task')
const FILE_EVENTS = ['file.saved', 'file.update']

class ImdoneRepoWorkerProxy extends Emitter {

  constructor (path, config, workerPath) {
    super()
    this.path = path
    this.config = config
    workerPath = workerPath || require.resolve('./repo-worker')
    this.worker = fork(workerPath)
    // TODO: All events comming from worker should be treated as repo events id:18 gh:105
    this.worker.on('message', ({event, data}) => {
      // console.log('** received message **')
      // console.log(`- event: ${event}`)
      // console.log(`- data: ${JSON.stringify(data, null, 3)}`)
      if (event === 'initialized' && data.lists) {
        data.lists.forEach(list => {
          list.tasks = list.tasks.map(task => new Task(task))
        })
      }
      if (FILE_EVENTS.includes(event)) data = new File(data)
      this.emit(event, data)
    })
    // TODO: update this.config on config.update gh:281 id:19
    this.on('config.update', config => this.config = config)
    this.send('create', {path, config})
  }

  destroy () {
    this.send('destroy')
    this.worker.kill('SIGHUP')
  }

  init () {
    this.send('init')
  }

  modifyTask (task, writeFile) {
    this.send('modifyTask', {task, writeFile})
  }

  send (event, data) {
    console.log(`Sending message to worker: ${event}`)
    this.worker.send({event, data})
  }
}

module.exports = {ImdoneRepoWorkerProxy}
