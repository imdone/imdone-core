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

  toJSON () {
    console.log('defaultFilter:', this.defaultViewFilter)
    console.time('totals time')
    let allLists = this.allLists
    const totals = calculateTotals(allLists)
    allLists = allLists.map(list => {
      list.tasks = list.tasks.map(card => {
        card.interpretedContent = ''
        card.totals = totals
        return card
      })
      return list
    })

    this.pluginManager.updateLists(allLists)

    const cards = allLists.map(list => list.tasks).flat().map(card => card.init(totals))
    const lists = this.getLists({
      tasks: this.getCards(this.filter, cards),
      populateFiltered: true
    })
    console.timeEnd('totals time')
    return {
      path: this.path,
      config: this.config,
      lists: lists,
      files: this.files, 
      totals,
      filter: this.filter
    }
  }

  init (cb = () => {}) {
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
    const cards = this.getCards()
    return this.getLists({
      tasks: this.getCards(this.filter, cards)
    })
  }

  get allLists() {
    return this.getLists()
  }

  getLists(opts) {
    const tasks = (opts && opts.tasks) || this.getCards()
    const populateFiltered = opts && opts.populateFiltered
    return Repository.getTasksByList(this.repo, tasks, false, populateFiltered)
  }

  getCards (filter = this.defaultViewFilter, tasks = this.repo.getTasks()) {
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