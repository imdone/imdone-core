import { Project } from 'imdone-api/lib/project';
import PluginManager from './plugins/plugin-manager';
import Repository from './repository';
import _cloneDeep from 'lodash.clonedeep';
import newCard from './card';
import constants from './constants';
const { JOURNAL_TYPE, CONFIG_DIR } = constants;
import _path from 'path';
import moment from 'moment';
import { getIsoDateWithOffset } from './adapters/date-time';
import * as fileGateway from './adapters/file-gateway';
import matter from 'gray-matter';
import _isObject from 'lodash.isobject';
import _isString from 'lodash.isstring';
import _isFunction from 'lodash.isfunction';
import exec from 'child_process';
import { sort } from 'fast-sort';
import Task from './task';
import eol from 'eol';
import { renderMarkdown, extractWikilinkTopics } from './adapters/markdown';
import { getFunctionSignature } from './adapters/parsers/function-parser';
import { format } from './adapters/parsers/content-transformer';

function calculateTotals(lists = []) {
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

export default class WorkerProject extends Project {
  constructor(repo) {
    super()
    this.repo = repo
    this.innerFilter = ''
    this.fileGateway = fileGateway
    this._updatedAt = undefined
    this.data = {}
    this.dataKeys = []
    this.repo.project = this
    this.pluginManager = new PluginManager(this)
  }

  get configDir() {
    return _path.join(this.path, CONFIG_DIR)
  }

  get allTopics() {
    return [...this.repo.allTopics]
  }

  get allTags() {
    return [...this.repo.allTags]
  }

  get allContexts() {
    return [...this.repo.allContexts]
  }

  get allMeta() {
    return this.repo.allMeta
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

  get isoDateWithOffset() {
    return getIsoDateWithOffset()
  }

  get updatedAt() {
    return this._updatedAt
  }

  get files() {
    return this.repo.getFilePaths()
  }

  get config() {
    return this.repo.config
  }

  get defaultFilter() {
    return this.config && this.config.defaultFilter
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

  get boardActions() {
    return [
      ...this.pluginManager.getBoardActions(),
    ]
  }

  get filter() {
    return this.innerFilter
  }

  set filter(filter) {
    this.innerFilter = filter
  }

  async init() {
    this.pluginManager.on('plugin-installed', () => this.emitUpdate())
    this.pluginManager.on('plugin-uninstalled', () => this.emitUpdate())
    this.pluginManager.on('plugins-reloaded', () => this.emitUpdate())
    await this.pluginManager.loadPlugins()
    this.data = await this.pluginManager.getBoardProperties()
    this.dataKeys = this.getDataKeys(this.data)

    console.log('data', this.data)
    console.log('dataKeys', this.dataKeys)
    EVENTS.forEach((event) => {
      this.repo.on(event, (data) => onChange(this, event, data))
    })

    this.repo.on('task.found', (task) => this.pluginManager.onTaskFound(task))

    const files = await this.repo.init()
    
    try {
      await this.pluginManager.startDevMode()
    } catch (err) {
      console.log('Error on starting dev mode', err)
      throw new Error('Error on starting dev mode', { cause: err })
    }

    return files
  }

  initIndexes(allLists) {
    allLists.forEach((list) => {
      list.tasks.filter(list => !list.filter).forEach((task, index) => {
        task.index = index
      })
    })
  }
  
  // HACK To handle circular dependency issue with file
  // <!--
  // order:0
  // -->
  toJSON() {
    return { path: this.path }
  }

  getListsForImdoneJSON() {
    this.initIndexes(this.repo.getTasksByList())
    let allLists = this.getLists({
      populateFiltered: true,
    })
    const totals = calculateTotals(allLists)
    allLists = allLists.map((list) => {
      list = { ...list }
      list.tasks = list.tasks.map((card, index) => {
        card.interpretedContent = ''
        card.totals = totals
        return card
      })
      return list
    })

    return { allLists, totals }
  }

  getInitializedCards(allLists, totals) {
    return allLists
    .map((list) => list.tasks)
    .flat()
    .map(
      (card) => card.init(totals)
    )
  }

  async toImdoneJSON() {
    this.pluginManager.initDevMode()
    console.time('toJSON time')
    this._updatedAt = new Date()
    const { allLists , totals } = this.getListsForImdoneJSON()

    console.time('plugin onBeforeBoardUpdate time')
    await this.pluginManager.onBeforeBoardUpdate()
    console.timeEnd('plugin onBeforeBoardUpdate time')

    console.time('getBoardProperties time')
    const data = this.data = await this.pluginManager.getBoardProperties()
    console.timeEnd('getBoardProperties time')
    
    console.time('getDataKeys time')
    const dataKeys = this.dataKays = this.getDataKeys(data)
    console.timeEnd('getDataKeys time')

    console.time('card init time')
    const cards = this.getInitializedCards(allLists, totals)
    console.timeEnd('card init time')

    console.time('plugin onBoardUpdate time')
    await this.pluginManager.onBoardUpdate(allLists)
    console.timeEnd('plugin onBoardUpdate time')

    console.time('getTags time')
    const tags = this.getTags(cards)
    console.timeEnd('getTags time')

    console.time('getLists time')
    const lists = this.filter
    ? this.getRequestedLists(cards)
    : allLists
    console.timeEnd('getLists time')

    console.timeEnd('toJSON time')
    return {
      path: this.path,
      config: this.config,
      lists: lists,
      files: this.files,
      totals,
      totalCards: this.repo.getTasks().length,
      tags,
      allMeta: this.allMeta,
      allContexts: this.allContexts,
      allTags: this.allTags,
      filter: this.filter,
      defaultFilter: this.defaultFilter,
      actions: this.boardActions,
      plugins: this.pluginManager.getPlugins(),
      data,
      dataKeys,
      queryProps: this.getQueryProps(cards),
    }
  }

  getRequestedLists(cards) {
    return this.getLists({
      tasks: this.getCards(this.filter, cards),
      populateFiltered: true,
    }).map(list => {
      const configList = this.config.lists.find(l => l.name === list.name)
      list.hidden = configList && configList.hidden
      if (this.hideLists.includes(list.name)) {
        list.hidden = true
      }
      return list
    })
  }

  emit() {} // This is implemented in imdone UI worker

  emitUpdate() {
    this.emit('file.update')
  }

  destroy() {
    this.repo.destroy()
    if (this.pluginManager) this.pluginManager.destroyPlugins()
  }

  getDataKeys(data) {
    const keys = Object.keys(data).map((key) => {
      const value = data[key]
      if (_isFunction(value)) {
        key = getFunctionSignature(value)
      }
      return key
    })
    keys.forEach((key) => {
      const value = data[key]
      if (_isObject(value) && !Array.isArray(value)) {
        keys.push(...Object.keys(value).map((k) => `${key}.${k}`))
      }
    })
    return keys
  }

  removeList(list) {
    this.repo.removeList(list)
  }

  getLists(opts) {
    const {tasks = this.getDefaultFilteredCards(), populateFiltered = false} = opts || {}
    return Repository.getTasksByList(this.repo, tasks, true, populateFiltered)
  }

  getTaskQueryProps(props) {
    const queryProps = []
    if (props) {
      // add all properties of the task to the queryProps array
      Object.keys(props).forEach((key) => {
        if (key === 'data') return
        if (queryProps.includes(key)) return
        
        queryProps.push(key)
        
        if (_isObject(props[key])) {
          Object.keys(props[key]).forEach((subKey) => {
            if (!queryProps.includes(`${key}.${subKey}`))
              queryProps.push(`${key}.${subKey}`)
          })
        }
      })
    }
    return queryProps
  }

  getQueryProps(cards) {
    if (!cards) return []
    const queryProps = this.getTaskQueryProps(cards[0])
    return [
      ...new Set(queryProps),
      ...[...this.repo.metaKeys].map(key => `allMeta.${key}`),
      ...[...this.repo.metaKeys].map(key => `meta.${key}`),
      ...this.allTopics,
      ...this.allTags,
      ...this.allContexts,
    ]
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

    return sort(tags).by([
      {desc: (tag) => tag.count},
      {asc: (tag) => tag.name},
    ])
  }

  getDefaultFilteredCards() {
    return this.filterCards(this.repo.getTasks(), this.defaultFilter)
  }

  getAllCards(filter) {
    const allTasks = this.repo.getTasks()
    return this.getCards(filter, allTasks)
  }

  getCards(filter, cards = this.getDefaultFilteredCards()) {
    cards = filter ? this.filterCards(cards, filter) : cards
    return cards
  }

  filterCards(cards, filter) {
    this.hideLists = []
    const {
      result,
      hideLists
    } = Repository.filterCards(cards, filter)
    this.hideLists = hideLists
    return result
  }

  async addMetadata(task, key, value) {
    if (task.hasMetaData(key, value)) return
    if (!task.allMeta[key]) task.allMeta[key] = []
    task.allMeta[key].push(value)
    if (!/^['"]/.test(value) && /\s/.test(value)) value = `"${value}"`
    const metaData = `${key}${this.config.getMetaSep()}${value}`
    const content = task.addToLastCommentInContent(
      task.content,
      metaData,
      this.config.isMetaNewLine()
    )
    return await this.updateCardContent(task, content)
  }

  async removeMetadata(task, key, value) {
    if (!task.meta[key]) return
    const file = this.getFileForTask(task)
    const content = file.removeMetaData(task.content, key, value)
    return await this.updateCardContent(task,content)
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
    return await this.updateCardContent(task, content)
  }

  async removeTag(task, tag) {
    if (!task.tags.includes(tag)) return
    const tagContent = new RegExp(
      `\\${this.config.getTagPrefix()}${tag}\\s`,
      'g'
    )
    console.log('removeTag regex:', tagContent)
    const content = task.content.replace(tagContent, '')
    return await this.updateCardContent(task, content)
  }

  async moveTask(task, newList, newPos) {
    return new Promise((resolve, reject) => {
      this.repo.moveTask({task, newList, newPos}, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  getFile(filePath) {
    return this.repo.getFile(filePath)
  }

  getFileForTask(task) {
    return this.repo.getFileForTask(task)
  }

  rollBackFileForTask(task) {
    return this.getFileForTask(task).rollback().extractTasks(this.config)
  }

  async updateCardContent(task, content) {
    const file = await this.repo.modifyTaskFromContent(task, content)
    this.emitUpdate()
    return file
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

  async copyToClipboard(text, message) {this.files
    this.emit('project.copyToClipboard', { text, message })
  }

  async openUrl(url) {
    this.emit('project.openUrl', url)
  }

  // TODO For methods that emit, they should still do the thing without imdone UI
  // <!--
  // #urgent
  // #important
  // order:-195
  // -->
  async openPath(path) {
    this.emit('project.openPath', path)
  }

  saveFile(content, file) {
    const filePath = this.getFullPath(file)
    this.emit('project.saveFile', { file: filePath, content })
  }

  /*
    * @param {Object} opts - The options object
    * @param {String} opts.list - The list name to add the card to
    * @param {String} opts.path - The path to the file to add the card to
    * @param {String} opts.template - The template to use for the new card
    * @param {String} opts.title - The title of the new card
    * @param {String} opts.comments - The comments to add to the new card
    * @param {Boolean} opts.emit - Whether to emit the new card event 
  */
  async newCard({ list, path, template, title, comments, emit = true }) {
    if (!path || !_path.parse(path).ext) path = this.getNewCardsFile({title})
    path = this.getFullPath(path)

    const { isFile, isDirectory } = fileGateway.preparePathForWriting(path)
    
    if (!template) template = this.getNewCardTemplate(path, isFile)

    const boardData = await this.pluginManager.getBoardProperties();
    template = format(template, boardData)
    
    if (comments) template = Task.addToLastCommentInContent(template, comments, this.config.isMetaNewLine())

    let relativePath = _path.relative(this.path, path)
    if (isDirectory) relativePath += _path.sep

    const data = {
      list,
      path,
      relativePath,
      template,
      isDirectory,
    }
    if (emit) this.emit('project.newCard', data)
    return data
  }

  async addCardToFile(opts) {
    return this.addTaskToFile(opts)
  }
  
  async addTaskToFile({path, list = this.config?.getDefaultList(), content, tags = [], contexts = [], meta = [], useCardTemplate = false}) {
    const pluginMods = await this.pluginManager.onBeforeAddTask({path, list, meta, tags, contexts, content, useCardTemplate})
    path = pluginMods.path
    content = pluginMods.content
    meta = pluginMods.meta
    tags = pluginMods.tags
    contexts = pluginMods.contexts
    const cardData = await this.newCard({list, path, title: eol.split(content)[0], emit: false})
    const filePath = cardData.path
    if (useCardTemplate) content += cardData.template

    const boardData = await this.pluginManager.getBoardProperties();
    const data = { ...boardData, ...cardData}
    content = format(content, data)

    content = this.addTagsToContent(tags, content)
    content = this.addContextsToContent(contexts, content)
    content = this.addMetaToContent(meta, content)

    return await this.repo.addTaskToFile(filePath, list, content)
  }

  addMetaToContent(meta, content) {
    if (meta && meta.length > 0) {
      let metaContent = ''
      meta.forEach(({ key, value }) => {
        if (!/^['"]/.test(value) && /\s/.test(value)) value = `"${value}"`
        const metaData = `${key}${this.repo.config.getMetaSep()}${value}`
        if (content.includes(metaData)) return
        const existingMetadata = Task.parseMetaData(this.config, content)[key]
        if (existingMetadata) {
          content = Task.removeMetaData({
            config: this.config,
            content,
            key,
            value: existingMetadata[0],
          })
        }
        const spaceOrNewLine = this.config.isMetaNewLine() ? '\n' : ' '
        metaContent = `${metaContent}${spaceOrNewLine}${metaData}`
      })
      content = Task.addToLastCommentInContent(content, metaContent.trim(), this.config.isMetaNewLine())
    }
    return content
  }

  addContextsToContent(contexts, content) {
    if (contexts && contexts.length > 0) {
      let contextContent = ''
      contexts.forEach(context => {
        const contextWithPrefix = `@${context}`
        if (content.includes(contextWithPrefix)) return
        contextContent = `${contextContent} @${context}`
      })
      content = Task.addToLastCommentInContent(content, contextContent.trim(), this.config.isMetaNewLine())
    }
    return content
  }

  addTagsToContent(tags, content) {
    if (tags && tags.length > 0) {
      let tagContent = ''
      tags.forEach(tag => {
        const tagWithPrefix = `${this.config.getTagPrefix()}${tag}`
        if (content.includes(tagWithPrefix)) return
        tagContent = `${tagContent} ${tagWithPrefix}`
      })
      content = Task.addToLastCommentInContent(content, tagContent.trim(), this.config.isMetaNewLine())
    }
    return content
  }

  async deleteTask(task) {
      await this.repo.deleteTask(task)
      await this.pluginManager.onAfterDeleteTask(task)
  }

  async deleteTasks(tasks) {
    await this.repo.deleteTasks(tasks)
  }

  setFilter(filter) {
    this.emit('project.filter', { filter })
  }
 
  getNewCardTemplate(file, isFile) {
    const frontMatter = this.getNewCardFileFrontMatter(file, isFile)
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

  getNewCardFileFrontMatter(file, isFile) {
    let fileContent = ''
    if (file && isFile) {
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
    return filePath
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

      return filePath
    }
  }

  sanitizeFileName(fileName) {
    return fileGateway.sanitizeFileName(fileName, this.config.replaceSpacesWith)
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

    const fullFilePath = this.getFullPath(filePath)
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
    // TODO These card actions should be removed
    // #imdone-1.54.0
    // <!--
    // order:-175
    // -->
    const actions = {
      filter: (filter) => {
        this.setFilter(filter)
      },
      newCard: async (list, path) => {
        if (task.source.lang !== 'text')
          return this.alert('Unable to append cards in code files.')
        if (path) path = this.getFullPath(path)
        await this.newCard({ list, path })
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
  performBoardAction(action, task) {
    if (task) task = this.repo.getTask(task.id)
    if (action && action.plugin)
      return this.pluginManager.performBoardAction(action, task)
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

  async refresh() {
    await this.repo.refresh()
    await this.pluginManager.reloadPlugins()
  }

  renderMarkdown(content, filePath) {
    return renderMarkdown(content, filePath || this.path)
  }

  extractWikilinkTopics(markdown) {
    return extractWikilinkTopics(markdown)
  }
}
