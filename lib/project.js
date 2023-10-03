const { Project } = require('imdone-api/lib/project')
const PluginManager = require('./plugins/plugin-manager')
const Repository = require('./repository')
const _cloneDeep = require('lodash.clonedeep')
const newCard = require('./card')
const sanitize = require('sanitize-filename')
const { JOURNAL_TYPE } = require('./constants')
const _path = require('path')
const moment = require('moment')
const fileGateway = require('./adapters/file-gateway')
const matter = require('gray-matter')
const _isObject = require('lodash.isobject')
const _isString = require('lodash.isstring')
const exec = require('child_process').exec
const fastSort = require('fast-sort/dist/sort.js')
const Task = require('./task')
const eol = require('eol')

function calculateTotals(lists) {
  const totals = {}
  lists.forEach((list) => {
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
  'config.update',
]

module.exports = class WorkerProject extends Project {
  constructor(repo) {
    super()
    this.repo = repo
    this.innerFilter = ''
  }

  // HACK:-50 To handle circular dependency issue with file
  toJSON() {
    return { path: this.path }
  }

  toImdoneJSON() {
    this.pluginManager.initDevMode()
    console.time('toJSON time')
    const totals = calculateTotals(
      this.getLists({
        populateFiltered: true,
      })
    )
    let allLists = this.allLists
    allLists = allLists.map((list) => {
      list.tasks = list.tasks.map((card) => {
        card.interpretedContent = ''
        card.totals = totals
        return card
      })
      return list
    })

    console.time('plugin onBeforeBoardUpdate')
    this.pluginManager.onBeforeBoardUpdate()
    console.timeEnd('plugin onBeforeBoardUpdate')

    console.time('card init')
    const cards = allLists
      .map((list) => list.tasks)
      .flat()
      .map((card) => card.init(totals))
    console.timeEnd('card init')

    console.time('plugin onBoardUpdate')
    this.pluginManager.onBoardUpdate(
      this.getLists({
        tasks: cards,
      })
    )
    console.timeEnd('plugin onBoardUpdate')

    const lists = this.getLists({
      tasks: this.getCards(this.filter, cards),
      populateFiltered: true,
    })
    console.timeEnd('toJSON time')
    return {
      path: this.path,
      config: this.config,
      lists: lists,
      files: this.files,
      totals,
      tags: this.getTags(),
      filter: this.filter,
      defaultFilter: this.defaultFilter,
      actions: this.boardActions,
      plugins: this.pluginManager.getPlugins(),
    }
  }

  init(cb) {
    this.repo.project = this
    this.pluginManager = new PluginManager(this)
    this.pluginManager.on('plugin-installed', () => this.emitUpdate())
    this.pluginManager.on('plugin-uninstalled', () => this.emitUpdate())
    this.pluginManager.on('plugins-reloaded', () => this.emitUpdate())

    EVENTS.forEach((event) => {
      this.repo.on(event, (data) => onChange(this, event, data))
    })

    
    const promise = new Promise((resolve, reject) => {
      this.repo.init((err, files) => {
        if (err) {
          if (cb) cb(err)
          else reject(err)
          return
        }
        this.pluginManager
          .startDevMode()
          .then(() => {
            if (cb) cb(null, files)
            else resolve(files)
          })
          .catch(err => {
            console.log('Error on starting dev mode', err)
            if (cb) cb(err)
            else reject(err)
          })
      })
    })

    if (!cb) return promise
  }

  emit() {}

  emitUpdate() {
    this.emit('file.update')
  }

  destroy() {
    this.repo.destroy()
    if (this.pluginManager) this.pluginManager.destroyPlugins()
  }

  get lists() {
    return this.getLists({
      tasks: this.filteredCards,
    })
  }

  get allLists() {
    return this.getLists()
  }

  get filteredCards() {
    return this.getCards(this.filter)
  }

  removeList(list) {
    this.repo.removeList(list)
  }

  getLists(opts) {
    const {tasks = this.getDefaultFilteredCards(), populateFiltered = false} = opts || {}
    return Repository.getTasksByList(this.repo, tasks, true, populateFiltered)
  }

  getTags(cards = this.getDefaultFilteredCards()) {
    const tags = []
    cards.forEach((card) => {
      card.allTags.forEach((tag) => {
        let foundTag = tags.find(({name}) => tag === name)
        if (!foundTag) {
          foundTag = {name: tag, count: 1}
          tags.push(foundTag)
        }
        foundTag.count++
      })
    })

    return fastSort(tags).by([
      {desc: (tag) => tag.count},
      {asc: (tag) => tag.name},
    ])
  }

  getDefaultFilteredCards() {
    return Repository.query(this.repo.getTasks(), this.defaultFilter)
  }

  getAllCards(filter) {
    const allTasks = this.repo.getTasks()
    return this.getCards(filter, allTasks)
  }

  getCards(filter, tasks = this.getDefaultFilteredCards()) {
    return filter ? Repository.query(tasks, filter) : tasks
  }

  get files() {
    return this.repo.getFilePaths()
  }

  get config() {
    return this.repo.config
  }

  get defaultFilter() {
    return this.config.defaultFilter
  }

  set defaultFilter(filter) {
    this.config.defaultFilter = filter
  }

  get totals() {
    return calculateTotals(this.lists)
  }

  get path() {
    return this.repo.path
  }

  get name() {
    return this.repo.getDisplayName()
  }

  get doneList() {
    return this.config.getDoneList()
  }

  get filter() {
    return this.innerFilter
  }

  get boardActions() {
    return [
      ...this.config.boardActions.map((item, index) => {
        return { ...item, index }
      }),
      ...this.pluginManager.getBoardActions(),
    ]
  }

  set filter(filter) {
    this.innerFilter = filter
  }

  async addMetadata(task, key, value) {
    if (task.hasMetaData(key, value)) return
    if (!task.allMeta[key]) task.allMeta[key] = []
    task.allMeta[key].push(value)
    if (!/^['"]/.test(value) && /\s/.test(value)) value = `"${value}"`
    const metaData = `${key}${this.repo.config.getMetaSep()}${value}`
    const content = task.addToLastCommentInContent(
      task.content,
      metaData,
      this.repo.config.isMetaNewLine()
    )
    return this.updateCardContent(task, content)
  }

  async removeMetadata(task, key, value) {
    if (!task.meta[key]) return
    const file = this.repo.getFileForTask(task)
    return this.updateCardContent(
      task,
      file.removeMetaData(task.content, key, value)
    )
  }

  async addTag(task, tag) {
    if (task.tags.includes(tag)) return
    task.allTags.push(tag)
    const tagContent = `${this.config.getTagPrefix()}${tag}`
    const content = task.addToLastCommentInContent(
      task.content,
      tagContent,
      this.config.isMetaNewLine()
    )
    return this.updateCardContent(task, content)
  }

  async removeTag(task, tag) {
    if (!task.tags.includes(tag)) return
    const tagContent = new RegExp(
      `\\${this.config.getTagPrefix()}${tag}\\s`,
      'g'
    )
    console.log('removeTag regex:', tagContent)
    const content = task.content.replace(tagContent, '')
    return this.updateCardContent(task, content)
  }

  async moveTask(task, newList, newPos) {
    return new Promise((resolve, reject) => {
      this.repo.moveTask({task, newList, newPos}, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async updateCardContent(task, content) {
    return new Promise((resolve, reject) => {
      this.repo.modifyTaskFromContent(task, content, (err) => {
        if (err) {
          console.error(err)
          reject(err)
        }
        this.emitUpdate()
        resolve()
      })
    })
  }

  async snackBar({ message, type, duration }) {
    this.emit('project.snackBar', { message, type, duration })
  }

  async toast({ message, type, duration }) {
    this.emit('project.toast', { message, type, duration })
  }

  filterLists(filter, lists = this.lists) {
    return lists.map((list) => {
      let newList = { ...list, tasks: [] }
      newList = _cloneDeep(newList)
      newList.tasks = Repository.query(list.tasks, filter)
      return newList
    })
  }

  async copyToClipboard(text, message) {
    this.emit('project.copyToClipboard', { text, message })
  }

  async openUrl(url) {
    this.emit('project.openUrl', url)
  }

  async openPath(path) {
    this.emit('project.openPath', path)
  }

  saveFile(content, file) {
    const filePath = this.getFullPath(file)
    this.emit('project.saveFile', { file: filePath, content })
  }

  newCard(opts = {}) {
    let { list, path, template, title, emit = true } = opts
    if (path) {
      path = this.getFullPath(path)
      if (!fileGateway.existsSync(path)) {
        fileGateway.writeFileSync(path, '')
      }
    } else {
      path = this.getFullPath(this.getNewCardsFile({title}))
    }
    const stat = fileGateway.statSync(path)
    if (!template) template = this.getNewCardTemplate(path, stat)

    const data = {
      list,
      path,
      template,
      isDirectory: stat.isDirectory(),
    }
    if (emit) this.emit('project.newCard', data)
    return data
  }

  async addTaskToFile({path, list, content, tags = [], contexts = [], meta = [], addTemplate}) {
    const pluginMods = await this.pluginManager.onBeforeAddTask({path, list, meta, tags, contexts, content})
    path = pluginMods.path
    content = pluginMods.content
    meta = pluginMods.meta
    tags = pluginMods.tags
    contexts = pluginMods.contexts
    const cardData = this.newCard({list, path, title: eol.split(content)[0], emit: false})
    const filePath = cardData.path
    if (addTemplate) content += cardData.template

    if (tags && tags.length > 0) {
      let tagContent = ''
      tags.forEach(tag => {
        const tagWithPrefix = `${this.config.getTagPrefix()}${tag}`
        if (content.includes(tagWithPrefix)) return
        tagContent = `${tagContent} ${tagWithPrefix}`
      })
      content = Task.addToLastCommentInContent(content, tagContent.trim(), this.config.isMetaNewLine())
    }
    if (contexts && contexts.length > 0) {
      let contextContent = ''
      contexts.forEach(context => {
        const contextWithPrefix = `@${context}`
        if (content.includes(contextWithPrefix)) return
        contextContent = `${contextContent} @${context}`
      })
      content = Task.addToLastCommentInContent(content, contextContent.trim(), this.config.isMetaNewLine())
    }
    if (meta && meta.length > 0) {
      let metaContent = ''
      meta.forEach(({key, value}) => {
        if (!/^['"]/.test(value) && /\s/.test(value)) value = `"${value}"`
        const metaData = `${key}${this.repo.config.getMetaSep()}${value}`
        if (content.includes(metaData)) return
        metaContent = `${metaContent} ${metaData}`
      })
      content = Task.addToLastCommentInContent(content, metaContent.trim(), this.config.isMetaNewLine())
    }
    return new Promise((resolve, reject) => {
      this.repo.addTaskToFile(filePath, list, content, (err, file) => {
        if (err) return reject(err)
        resolve(file)
      })
    })
  }

  setFilter(filter) {
    this.emit('project.filter', { filter })
  }

  getNewCardTemplate(file, stat) {
    const frontMatter = this.getNewCardFileFrontMatter(file, stat)
    const card = newCard(
      {
        frontMatter,
        repoId: this.path,
        text: '',
        source: { path: this.getNewCardsFile() },
      },
      this,
      true
    )
    card.init(this.totals)
    return card.formatContent(frontMatter.template).content
  }

  getNewCardFileFrontMatter(file, stat) {
    let fileContent = ''
    if (file && stat.isFile()) {
      fileContent = fileGateway.readFileSync(file, 'utf8')
    } else if (JOURNAL_TYPE.NEW_FILE === this.config.journlType) {
      fileContent = this.config.journalTemplate
    }
    let { props, computed, template } = this.config.settings.cards
    const frontMatter = matter(fileContent).data || {}
    if (!_isObject(props)) props = {}
    if (!_isObject(computed)) computed = {}
    if (!_isString(template)) template = ''
    if (!_isObject(frontMatter.props)) frontMatter.props = {}
    if (!_isObject(frontMatter.computed)) frontMatter.computed = {}
    if (!_isString(frontMatter.template)) frontMatter.template = template
    props = {
      ...props,
      ...frontMatter.props,
      now: new Date().toDateString(),
      totals: this.totals,
    }
    computed = { ...computed, ...frontMatter.computed }
    return {
      ...frontMatter,
      props,
      computed,
      template: frontMatter.template,
    }
  }

  getNewCardsFile(opts = { relPath: false }) {
    const { relPath, title } = opts
    if (!this.config) return ''
    const filePath = this.appendNewCardsTo(title)
    if (!filePath) return ''
    if (fileGateway.existsSync(filePath))
      return relPath ? filePath.replace(this.path, '') : filePath
  }

  appendNewCardsTo(title) {
    const journalType = this.config.journalType
    if (journalType === JOURNAL_TYPE.SINGLE_FILE)
      return this.getFullPath(this.config.appendNewCardsTo)
    if (journalType === JOURNAL_TYPE.FOLDER)
      return this.getJournalFile().fullFilePath
    if (journalType === JOURNAL_TYPE.NEW_FILE) {
      if (!title) return this.getFullPath(this.config.journalPath)
      const fileName = `${this.sanitizeFileName(title)}.md`
      const fileFolder = this.getFullPath(this.config.journalPath)
      const filePath = _path.join(fileFolder, fileName)

      if (!fileGateway.existsSync(fileFolder))
        fileGateway.mkdirpSync(fileFolder)
      if (!fileGateway.existsSync(filePath))
        fileGateway.writeFileSync(filePath, this.config.journalTemplate)

      return filePath
    }
  }

  sanitizeFileName(name) {
    let fileName = sanitize(name)
    if (this.config.replaceSpacesWith)
      fileName = fileName.replace(/ /g, this.config.replaceSpacesWith)
    return fileName
  }

  getJournalFile() {
    const month = moment().format('YYYY-MM')
    const today = moment().format('YYYY-MM-DD')
    const journalPath = this.config.journalPath
    const folderPath = _path.join(journalPath, month)
    const journalFilePrefix = this.config.journalFilePrefix
    const journalFileSuffix = this.config.journalFileSuffix
    const filePath = _path.join(
      folderPath,
      `${journalFilePrefix}${today}${journalFileSuffix}.md`
    )

    const fullFolderPath = this.getFullPath(folderPath)
    const fullFilePath = this.getFullPath(filePath)
    if (!fileGateway.existsSync(fullFolderPath))
      fileGateway.mkdirpSync(fullFolderPath)
    if (!fileGateway.existsSync(fullFilePath)) {
      fileGateway.writeFileSync(fullFilePath, this.config.journalTemplate)
    }
    return { filePath, fullFilePath }
  }

  getFullPath(...path) {
    if (_path.join(...path).startsWith(this.path)) {
      return _path.join(...path)
    }
    return _path.join.apply({}, [this.path, ...path])
  }

  performCardAction(action, task) {
    task = this.repo.getTask(task.id)
    try {
      action = JSON.parse(action)
    } catch (e) {
      //
    }
    if (action.plugin) return this.pluginManager.performCardAction(action, task)

    const actionFunction = task.getCardActions()[action.index].action
    const actions = {
      filter: (filter) => {
        this.setFilter(filter)
      },
      newCard: (list, path) => {
        if (task.source.lang !== 'text')
          return this.alert('Unable to append cards in code files.')
        if (path) path = this.getFullPath(path)
        this.newCard({ list, path })
      },
      alert: (msg) => {
        this.toast({ message: msg })
      },
      openUrl: (url) => {
        this.openUrl(url)
      },
      execCommand: (cmd) => {
        return this.exec(cmd)
      },
      copy: (content, msg) => {
        this.copyToClipboard(content, msg)
      },
    }
    const actionThis = {
      ...task.data,
      ...task.desc,
      actions,
    }

    try {
      console.log('actionFunction:', actionFunction)
      const func = new Function(`return ${actionFunction}`)()
      func.apply(actionThis)
    } catch (e) {
      console.error(e)
      console.log('action:', actionFunction)
      console.log('this:', actionThis)
    }
  }
  performBoardAction(action) {
    if (action && action.plugin)
      return this.pluginManager.performBoardAction(action)
    const actions = {
      filter: (filter) => {
        this.setFilter(filter)
      },
      alert: (msg) => {
        this.toast({ message: msg })
      },
      saveFile: ({ file, content }) => {
        this.saveFile(content, file)
      },
      mailto: ({ subject, body, to, cc, bcc }) => {
        const params = []
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
        if (body) params.push(`body=${encodeURIComponent(body)}`)
        if (cc) params.push(`cc=${encodeURIComponent(cc)}`)
        if (bcc) params.push(`bcc=${encodeURIComponent(bcc)}`)
        const url = `mailto:${to}?${params.join('&')}`
        console.log('opening email with:', url)
        this.openUrl(url)
      },
      copy: (content, message) => {
        this.copyToClipboard(content, message || 'Your content has been copied')
      },
      updateCard: (task, content) => {
        this.updateCardContent(task, content)
      },
    }
    const actionFunction = this.boardActions[action.index].action
    const actionThis = { cards: this.lists, ...actions }
    try {
      actionFunction.apply(actionThis)
    } catch (err) {
      console.error(err)
      console.log('action:', actionFunction)
      console.log('this:', actionThis)
    }
  }

  exec(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (stderr) console.warn('cmd stderr:', stderr)
        if (error) return reject(error)
        resolve(stdout)
      })
    })
  }

  installPlugin({ name, version }) {
    return this.pluginManager.installPlugin({ name, version })
  }

  uninstallPlugin(name) {
    return this.pluginManager.uninstallPlugin(name)
  }

  refresh() {
    return new Promise((resolve, reject) => {
      this.repo.refresh((err) => {
        if (err) return reject(err)
        ;(async () => {
          await this.pluginManager.reloadPlugins()
          resolve()
        })()
      })
    })
  }
}
