const Emitter = require('events')
const {fork} = require('child_process')
// const {getPackagePath} = require('./imdone-config')
const path = require('path')

module.exports = class ImdoneRepoWorkerProxy extends Emitter {

  constructor (_path, config, workerPath) {
    this.path = _path
    this.config = config
    // this.worker = fork(getPackagePath(path.join('lib', 'services', 'repo-worker.js')))
    this.worker = fork(workerPath))
    // TODO: All events comming from worker should be treated as repo events id:18 gh:105
    this.worker.on('message', ({event, data}) => {
      this.emit(event, data)
    })
    // TODO: update this.config on config.update gh:281 id:19
    this.on('config.update', config => this.config = config)
  }

  get path() {
    return this.path
  }

  get config() {
    return this.config
  }

  destroy () {
    send('destroy')
  }

  send (event, args) {
    this.worker.send({event, args})
  }
}
