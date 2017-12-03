const ImdoneRepo = require('imdone-core/lib/repository')
const repoWatchedFSStoreMixin = require('imdone-core/lib/mixins/repo-watched-fs-store')
let repoWorker = new RepoWorker(process)

module.exports = class RepoWorker {
  constructor (process) {
    process.on('message', ({event, data}) => {
      send('log',{event, data})
      this[event](data)
    })
  }

  create ({path, config}) {
    this.repo = repoWatchedFSStoreMixin(new ImdoneRepo(path, config))
  }

  init () {
    this.repo && this.repo.init()
  }
}
  // 'create',
  // 'init',
  // 'refresh',
  // 'modifyTask',
  // 'modifyConfig',
