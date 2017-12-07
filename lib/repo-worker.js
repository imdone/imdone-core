const ImdoneRepo = require('./repository')
const Task = require('./task')
const repoWatchedFSStoreMixin = require('./mixins/repo-watched-fs-store')

class RepoWorker {
  create ({path, config}) {
    this.repo = repoWatchedFSStoreMixin(new ImdoneRepo(path, config))
    this.repo.emit = (event, data) => process.send({event, data})
  }

  init () {
    this.repo && this.repo.init()
  }

  destroy () {
    this.repo && this.repo.destroy()
  }

  // Repo will emit task.modified
  modifyTask({task, writeFile}) {
    this.repo && this.repo.modifyTask(new Task(task), writeFile)
  }

}
  // 'create',
  // 'init',
  // 'refresh',
  // 'modifyTask',
  // 'modifyConfig',
let repoWorker = new RepoWorker()
process.on('message', ({event, data}) => repoWorker[event](data))
