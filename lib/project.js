const { Project } = require('imdone-api/lib/project')
const PluginManager = require('./plugin-manager')
const Repository = require('./repository')

function calculateTotals (lists) {
  const totals = {}
  lists.forEach(list => {
    try {
      totals[list.name] = list.tasks.length
    } catch (e) {
      console.error('Error calculating list totals:', e)
    }
  })
  return totals
}

function onChange(project, event, data) {
  project.emit(event, data)
}

const EVENTS = [
  'file.processed',
  'files.found',
  'file.update',
  'file.saved',
  'list.modified',
  'config.update'
]

module.exports = class WorkerProject extends Project {
  constructor(repo) {
    super()
    this.repo = repo
    this.innerFilter = ''
    this.pluginManager = new PluginManager(this.repo)
    EVENTS.forEach(event => {
      this.repo.on(event, (data) => onChange(this, event, data))
    })
}
  // DOING:0 ## Calls plugins
  // - filter: filter applied
  // - defaultViewFilter: filter always applied to board
  // - files: all files that contain cards
  // - lists: all [card](#card)s by list fully sorted filtered by defaultViewFilter and filter
  // - totals: all totals
  // <hr>
  // expand:1
  // epic:"release 1.3"
  // 
  toJSON () {
    console.time('totals time')
    const totals = this.totals
    this.lists.forEach(list => {
      list.tasks.forEach(card => {
        card.interpretedContent = ''
        card.totals = totals
      })
    })
    this.pluginManager.updateLists(this.allLists)
    this.lists.forEach(list => {
      list.tasks.forEach(card => card.init(totals))
    })
    console.timeEnd('totals time')
    return {
      path: this.path,
      config: this.config,
      lists: this.lists,
      files: this.files, 
      totals,
      filter: this.filter
    }
  }

  init (cb) {
    this.repo.project = this
    this.repo.init((err, files) => {
      if (err) return cb(err)
      cb(null, files)
    })
  }

  emit () {}

  destroy () {
    this.repo.destroy()
    if (this.pluginManager) this.pluginManager.destroyPlugins()
  }

  get lists() {
    let tasks = this.getCards(this.defaultViewFilter)
    if (this.filter) tasks = this.getCards(this.filter, tasks)
    return Repository.getTasksByList(this.repo, tasks, true)
  }

  get allLists() {
    return Repository.getTasksByList(this.repo, this.getCards(), true)
  }

  getCards (filter, tasks = this.repo.getTasks()) {
    return Repository.query(tasks, filter)
  }
  
  get files () {
    return this.repo.getFilePaths()
  }

  get config () {
    return this.repo.config
  }

  get defaultViewFilter () {
    return this.config.defaultFilter
  }

  get totals () {
    return calculateTotals(this.lists)
  }

  get path() {
    return this.repo.path;
  }

  get doneList() {
    return this.config.getDoneList()
  }

  get filter () {
    return this.innerFilter
  }

  set filter (filter) {
    this.innerFilter = filter
  }

  addMetadata(task, key, value) {
    if (!/^['"]/.test(value) && /\s/.test(value)) value = `"${value}"`
    const metaData = `${key}${this.repo.config.getMetaSep()}${value}`
    const content = task.addToLastCommentInContent(task.content, metaData, this.repo.config.isMetaNewLine())
    this.updateCardContent(task, content)
  }

  addTag(task, tag) {
    const tagContent = `${this.repo.config.getTagPrefix()}${tag}`
    const content = task.addToLastCommentInContent(task.content, tagContent, this.repo.config.isMetaNewLine())
    this.updateCardContent(task, content)
  }

  updateCardContent(task, content) {
    this.repo.modifyTaskFromContent(task, content)
  }

  newCard(list, path) {
    this.emit('project.newCard', {list, path})
  }

  snackBar({ message, type, duration }) {
    this.emit('project.snackBar', { message, type, duration })
  }

  toast({ message, type, duration }) {
    this.emit('project.toast', { message, type, duration })
  }

  filterLists (filter, lists = this.lists) {
    return lists.map(list => {
      let newList = {...list, tasks:[]}
      newList = _cloneDeep(newList)
      newList.tasks = query(list.tasks, filter)
      return newList
    })
  }

  copyToClipboard(text, message) {
    this.emit('project.copyToClipboard', {text, message})
  }

  openUrl(url) {
    this.emit('project.openUrl', url)
  }

  openPath(path) {
    this.emit('project.openPath', path)
  }
}