import _isFunction from 'lodash.isfunction'
import _isUndefined from 'lodash.isundefined'
import _isString from 'lodash.isstring'
import _omit from 'lodash.omit'
import _reject from 'lodash.reject'
import _noop from 'lodash.noop'
import _some from 'lodash.some'
import _remove from 'lodash.remove'
import _groupBy from 'lodash.groupby'
import _where from 'lodash.where'
import _template from 'lodash.template'
import _union from 'lodash.union'
import Emitter from 'events'
import languages from './languages'
import util from 'util'
import { parallel, eachLimit, eachSeries, series } from 'async-es'
import path from 'path'
import ignore from 'ignore'
import File from './file'
import eol from 'eol'
import tools from './tools'
const { inMixinsNoop } = tools
import constants from './constants'
import debug from 'debug'
const log = debug('imdone-core:Repository')
import List from './list'
import monquery from 'monquery'
import sift from 'sift'
import fastSort from 'fast-sort/dist/sort.js'
import JSONfns from 'json-fns'
import Task from './task'
import newCard from './card'
import { replaceDateLanguage } from './adapters/parsers/DateLanguageParser'
import { getRawTask, isNumber, LIST_NAME_PATTERN } from './adapters/parsers/task/CardContentParser'
import XRegExp from 'xregexp'
import appContext from './context/ApplicationContext'
import { file } from 'checksum'
const { ERRORS, ASYNC_LIMIT, DEFAULT_FILE_PATTERN} = constants
const DEFAULT_SORT = [{ asc: u => u.order }, { asc: u => u.text }]

function getPreviousIndexWithDifferentOrder(tasks, pos) {
  let closestIndexWithOrder = -1

  if (pos === 0) return closestIndexWithOrder
  
  let lastTask = tasks[pos] || tasks [pos - 1]

  for (
    let index = pos - 1;
    index >= 0 && closestIndexWithOrder < 0;
    index--
  ) {
    const t = tasks[index]
    if (!tasksHaveSameOrder(lastTask, t)) closestIndexWithOrder = index
    lastTask = t
  }
  return closestIndexWithOrder
}

function getNextIndexWithDifferentOrder(tasks, pos) {
  let closestIndexWithOrder = -1

  let lastTask = tasks[pos]

  for (
    let index = pos;
    index < tasks.length && closestIndexWithOrder < 0;
    index++
  ) {
    const t = tasks[index]
    if (!tasksHaveSameOrder(lastTask, t)) closestIndexWithOrder = index
    lastTask = t
  }
  return closestIndexWithOrder
}

function taskBeforeAndAfterHaveDifferentOrder(taskList, newPos) {
  const taskBefore = taskList[newPos - 1]
  const taskAfter = taskList[newPos]
  return taskBeforeHasOrder(taskList, newPos)
    && taskAfterHasOrder(taskList, newPos)
    && parseFloat(taskBefore.order) !== parseFloat(taskAfter.order)
}

function taskBeforeHasOrder(taskList, newPos) {
  const taskBefore = taskList[newPos - 1]
  return taskBefore && isNumber(taskBefore.order)
}

function taskAfterHasOrder(taskList, newPos) {
  const taskAfter = taskList[newPos]
  return taskAfter && isNumber(taskAfter.order)
}
function lastTaskHasOrder(taskList) {
  const lastTask = taskList[taskList.length - 1]
  return lastTask && isNumber(lastTask.order)
}

function getTasksToModify(task, taskList, newPos) {

  const previousIndexWithDifferentOrder = getPreviousIndexWithDifferentOrder(taskList, newPos)
  const nextIndexWithDifferentOrder = getNextIndexWithDifferentOrder(taskList, newPos)
  const previousTaskWithOrder = taskList[previousIndexWithDifferentOrder]
  const nextTaskWithOrder = taskList[nextIndexWithDifferentOrder]

  const startingOrder = previousTaskWithOrder
    ? isNumber(previousTaskWithOrder.order) && previousTaskWithOrder.order || 0
    : 0;
  const endingOrder = nextTaskWithOrder
    ? nextTaskWithOrder.order
    : null;

  const start = previousIndexWithDifferentOrder > -1 ? previousIndexWithDifferentOrder + 1 : 0;
  const end = nextIndexWithDifferentOrder > -1 ? nextIndexWithDifferentOrder : newPos + 1;
  const changes = nextIndexWithDifferentOrder - previousIndexWithDifferentOrder + 1
  const increment = isNumber(endingOrder) ? (endingOrder - startingOrder) / changes : 10
  const tasksToModify = []
  let newOrder = startingOrder
  let order = 0
  if (taskList.length === 0) {
    order = 0
  } else  if (newPos === 0) {
    order = taskList[0].order - 10
  } else if (newPos === taskList.length && lastTaskHasOrder(taskList)) {
    order = taskList[taskList.length - 1].order + 10
  } else if (taskBeforeAndAfterHaveDifferentOrder(taskList, newPos)) {
    order = (taskList[newPos].order - taskList[newPos - 1].order) / 2 + taskList[newPos - 1].order
  } else if (taskBeforeHasOrder(taskList, newPos) && !taskAfterHasOrder(taskList, newPos)) {
    order = taskList[newPos - 1].order + 10
  } else {
    for (let index = start; index < end; index++) {
      newOrder += increment
      if (index === newPos) {
        task.order = newOrder
        tasksToModify.push(task)
        newOrder += increment
      }

      if (!taskList[index]) continue
      taskList[index].order = newOrder
      tasksToModify.push(taskList[index])
    }  
  }

  if (tasksToModify.length === 0) {
    task.order = order
    tasksToModify.push(task)
  }

  return tasksToModify
}

function tasksHaveSameOrder(taskA, taskB) {
  return taskA && taskB && taskA.order + "" === taskB.order + ""
}

function getTasksByList (
  repo,
  tasksAry,
  noSort,
  populateFiltered
) {
  if (!repo) return []
  var tasks = {}
  var allTasks = noSort ? tasksAry : fastSort(tasksAry).by(DEFAULT_SORT)
  allTasks.forEach(function (task) {
    if (!tasks[task.list]) tasks[task.list] = []
    tasks[task.list].push(task)
  })
  var lists = repo.getLists()
  lists.forEach((list) => {
    if (list.filter && populateFiltered)
      return Repository.populateFilteredList(list, tasksAry)
    list.tasks = tasks[list.name] || []
  })
  return lists
}

function populateFilteredList (list, tasks) {
  try {
    list.tasks = Repository.query(tasks, list.filter).map((task) => {
      task.filteredListName = list.name
      return task
    })
  } catch (e) {
    list.tasks = []
  }
}

function regexQuery (tasks, queryString) {
  return tasks
    .map((task) => {
      const escapedQueryString = tools.escapeRegExp(queryString.trim());

      // Regex to match occurrences not part of a URL and not already surrounded by `==`
      const regex = new RegExp(
        `(?<!https?:\\/\\/[^\\s]*?)\\b${escapedQueryString}\\b(?![^\\s]*\\/)(?<!==)(?!==)`,
        'gi'
      );

      // Regex to detect Markdown links `[title](url)` where `queryString` is in title or URL
      const markdownLinkRegex = new RegExp(
        `\\[([^\\]]*${escapedQueryString}[^\\]]*)\\]\\(([^)]+${escapedQueryString}[^)]*)\\)`,
        'gi'
      );

      let match = task.content.match(regex) || task.content.match(markdownLinkRegex);
      task.match = match;

      if (match && queryString.trim() && task.interpretedContent) {
        // Replace standalone occurrences
        task.interpretedContent = task.interpretedContent.replace(
          regex,
          '==$&=='
        );

        // Replace Markdown links where queryString is in title or URL
        task.interpretedContent = task.interpretedContent.replace(
          markdownLinkRegex,
          (match) => `==${match}==`
        );

        task.updateDescriptionData();
      }

      return task;
    })
    .filter(({ match }) => match);
};


function parseHideListsFromQueryString (queryString) {
  const hideLists = []
  const regex = `hide:(\\s*((${LIST_NAME_PATTERN},?\\s?)+))?`
  queryString = queryString.replaceAll(
    // hide lists example `hide: list1, list2`
    new XRegExp(regex, 'g'),
    (match, allLists, lists) => {
      lists && lists.split(',').forEach((list) => {
        hideLists.push(list.trim())
      })
      return ''
    }
  ).trim()
  return {
    hideLists,
    queryString,
  }
}

function parseSortFromQueryString (queryString) {
  const sort = []
  queryString = queryString.replace(
    /\s([+-])([A-Za-z.]+)/g,
    (match, order, attr) => {
      const direction = order === '+' ? 'asc' : 'desc'
      const sortString = `{ "${direction}": "function (o) { return o.${attr}; }" }`
      sort.push(JSONfns.parse(sortString))
      return ''
    }
  )
  return {
    sort,
    queryString,
  }
}

function parseSortFromMongoQuery (mongoQuery) {
  const sort = []
  for (const [key, value] of Object.entries(mongoQuery.sort)) {
    if (value > 0) sort.push({ asc: key })
    else sort.push({ desc: key })
  }
  return sort
}

function sortByQuery (tasks, queryString = '') {
  queryString = replaceDateLanguage(queryString)
  let { sort } = Repository.parseSortFromQueryString(queryString)
  if (!sort || sort.length === 0) sort = DEFAULT_SORT
  fastSort(tasks).by(sort)
}

function filterCards (tasks, _queryString = '') {
  let query
  _queryString = replaceDateLanguage(_queryString)
  let { sort, queryString } = Repository.parseSortFromQueryString(_queryString);
  const hideListsQuery = Repository.parseHideListsFromQueryString(queryString);
  queryString = hideListsQuery.queryString;
  const hideLists = hideListsQuery.hideLists;
  try {
    query = monquery(queryString)
  } catch (e) {
    log(`Unable to parse ${_queryString} using monquery`)
  }
  let result = []
  if (query) result = tasks.filter(sift.default(query))
  if (!query || result.length === 0) {
    result = Repository.regexQuery(tasks, queryString)
  }
  if (!sort || sort.length === 0) sort = DEFAULT_SORT
  fastSort(result).by(sort)
  return {
    result,
    query,
    sort,
    hideLists
  }
}

function query (tasks, queryString) {
  return Repository.filterCards(tasks, queryString).result
}

function replaceDatesInQuery (query) {
  return Repository.filterObjectValues(query, (key, value) => {
    let date = Date.parse(value)
    if (date && /(\d{4})-(\d{2})-(\d{2})/.test(value)) {
      return date
    }
    return value
  })
}

function filterObjectValues (o, cb) {
  if (o && typeof o === 'object') {
    for (const [key, value] of Object.entries(o)) {
      if (value && typeof value === 'object') {
        Repository.filterObjectValues(value, cb)
      } else {
        o[key] = cb(key, value)
      }
    }
  }
  return o
}

// Emits task.found, list.found, file.update and file.delete, file.processed, files.saved
export default class Repository extends Emitter {

  constructor(_path, config) {
    super()
    this.config = config
    this.path = _path
    this.files = []
    this.languages = languages
    this.allMeta = {}
    this.metaKeys = new Set()
    this.allTags = new Set()
    this.allTopics = new Set()
    this.allContexts = new Set()
  }

  static getPreviousIndexWithDifferentOrder = getPreviousIndexWithDifferentOrder

  static getNextIndexWithDifferentOrder = getNextIndexWithDifferentOrder

  static getTasksToModify = getTasksToModify

  static getTasksByList = getTasksByList

  static populateFilteredList = populateFilteredList

  
  static regexQuery = regexQuery

  static parseHideListsFromQueryString = parseHideListsFromQueryString

  static parseSortFromQueryString = parseSortFromQueryString

  static parseSortFromMongoQuery = parseSortFromMongoQuery

  static sortByQuery = sortByQuery

  static filterCards = filterCards

  static query = query

  static replaceDatesInQuery = replaceDatesInQuery

  static filterObjectValues = filterObjectValues

  init () {
    inMixinsNoop()
  }

  // READY Refactor to use async/await
  // #esm-migration #urgent #important
  // <!--
  // order:-240
  // -->
  async refresh () {
    this.files = []
    this.allMeta = {}
    this.metaKeys = new Set()
    this.allTags = new Set()
    this.allTopics = new Set()
    this.allContexts = new Set()
    this.config.dirty = true

    let files = await this.getFilesInPath(false)
    try {
      const config = await this.loadConfig()
      this.config = config
      files = await this.readFiles()
      this.emit('initialized', { ok: true, lists: this.getTasksByList() })
    } catch (err) {
      this.emit('initialized', { ok: false })
      throw err
    }
    return files
  }

  /**
   * Description
   * @method destroy
   * @return
   */
  destroy () {
    this.destroyed = true
    this.removeAllListeners()
  }

  /**
   * Description
   * @method getId
   * @return CallExpression
   */
  getId () {
    return this.getPath()
  }

  getProject () {
    return this.project
  }

  getDisplayName () {
    return path.basename(this.path)
  }

  emitFileUpdate (file, force) {
    if (force || this.shouldEmitFileUpdate(file)) this.emit('file.update', file)
  }

  shouldEmitFileUpdate (file) {
    if (this.moving) return
    if (this.lastMovedFiles) {
      var index = this.lastMovedFiles.indexOf(file)
      if (index > -1) {
        this.lastMovedFiles.splice(index, 1)
      } else {
        if (file && file.updated) return true
      }
    } else {
      if (file && file.updated) return true
    }
  }

  emitConfigUpdate (data) {
    if (this.savingConfig) return
    process.nextTick(() => {
      this.emit('config.update', data)
    })
  }

  // READY Refactor createListeners to use async/await
  // #esm-migration
  // <!--
  // order:-120
  // -->
  createListeners () {
    if (this.taskListener) return

    this.taskListener = async (event, task) => {
      if (!this.listExists(task.list) && this.config.includeList(task.list)) {
        const list = new List({ name: task.list })
        await this.addList(list)
        this.emit('list.found', list)
        await this.saveConfig()
      }
      Object.keys(task.allMeta).forEach(key => this.metaKeys.add(key))
      task.topics.forEach(topic => this.allTopics.add(topic))
      task.allTags.forEach(tag => this.allTags.add(tag))
      task.allContext.forEach(context => this.allContexts.add(context))
      this.allMeta = this.addAllMeta(task.allMeta)
      this.emit(event, task)
    }

    this.taskFoundListener = (task) => {
      this.taskListener('task.found', task)
    }

    this.taskModifiedListener = (task) => {
      this.taskListener('task.modified', task)
    }
  }

  addAllMeta (meta) {
    const allMeta = Object.assign({}, this.allMeta)
    Object.keys(meta).forEach((key) => {
      if (!allMeta[key]) {
        allMeta[key] = meta[key]
        return
      }
      allMeta[key] = _union(allMeta[key], meta[key])
    })
    return allMeta
  }

  /**
   * Description
   * @method addList
   * @param {} list
   * @return
   */
  async addList (list) {
    if (this.listExists(list.name)) return;

    list = _omit(list, 'tasks');
    this.config.lists.push(new List(list));

    if (!list.filter && !/[a-z]/.test(list.name)) {
      const codeList = list.name.replace(/\s+/g, '-').toUpperCase();
      if (!this.config.code.include_lists.find((name) => name === codeList)) {
        this.config.code.include_lists.push(codeList);
      }
    }

    await this.saveConfig()
    this.emit('list.modified', list);
  };

  // READY Refactor removeList to use async/await
  // #esm-migration
  // <!--
  // order:-220
  // -->
  async removeList (list) {
    if (!this.listExists(list)) return

    var lists = _reject(this.getLists(), { name: list })
    if (this.config.code && this.config.code.include_lists) {
      this.config.code.include_lists = _reject(this.config.code.include_lists, list)
    }
    this.setLists(lists)
    await this.saveConfig()
    this.emit('list.modified', list)
  }

  /**
   * Description
   * @method getPath
   * @return MemberExpression
   */
  getPath () {
    return this.path
  }

  /**
   * Description
   * @method getConfig
   * @return MemberExpression
   */
  getConfig () {
    return this.config
  }

  /**
   * Description
   * @method getLists
   * @return MemberExpression
   */
  getLists () {
    const config = this.getConfig()
    return config ? config.lists.map(obj => ({...obj})) : []
  }

  getVisibleLists () {
    return _reject(this.getLists(), 'hidden')
  }

  isListVisible (name) {
    return this.getVisibleLists.find((list) => list.name === name)
  }

  /**
   * Description
   * @method setLists
   * @param {} lists
   * @return ThisExpression
   */
  setLists (lists) {
    this.config.lists = lists.map((list) => {
      return new List(list)
    })
    return this
  }

  /**
   * Description
   * @method listExists
   * @param {} name
   * @return BinaryExpression
   */
  listExists (name) {
    return this.getConfig().listExists(name)
  }

  /**
   * Save the config file (Implemented in mixins)
   *
   * @method saveConfig
   * @return
   */
  async saveConfig () {
    inMixinsNoop()
  }

  /**
   * Load the config file (Implemented in mixins)
   *
   * @method loadConfig
   * @return MemberExpression
   */
  // READY Refactor loadConfig to use async/await
  // #esm-migration #urgent
  // <!--
  // order:-160
  // -->
  async loadConfig () {
    inMixinsNoop()
  }

  async migrateTasksByConfig (oldConfig, newConfig) {
    return new Promise((resolve, reject) => {
      if (!oldConfig || !newConfig) return resolve()
      const oldMetaSep = oldConfig.getMetaSep()
      const newMetaSep = newConfig.getMetaSep()
      if (oldMetaSep === newMetaSep) return resolve()
      eachLimit(
        this.getFiles(),
        ASYNC_LIMIT,
        (file, cb) => {
          const tasks = fastSort(file.tasks).desc(u => u.line)
          eachSeries(
            tasks,
            async (task, cb) => {
              if (!Task.isTask(task)) return cb()
              try {
                task.replaceMetaSep(oldMetaSep, newMetaSep)
                await this.modifyTask(task, false)
                cb()
              } catch (err) {
                cb(err)
              }
            },
            async (err) => {
              if (err) return cb(err)
              if (!file.isModified() || file.getContent().trim() === '') return cb()
              try {
                const file = await this.writeFile(file)
                this.resetFile(file)
                cb(null, file)
              } catch (err) {
                cb(err)
              }
            }
          )
        },
        (err) => {
          if (err) return reject(err)
          resolve()
        }
      )
    })
  }

  /**
   * Get the full path from a relative path
   *
   * @method getFullPath
   * @param {} file
   * @return String
   */
  getFullPath (file) {
    if (File.isFile(file)) file = file.path
    if (file.indexOf(this.path) === 0) return file
    try {
      var fullPath = path.join(this.path, file)
      return fullPath
    } catch (e) {
      throw new Error(
        util.format(
          'Error getting full path for file:%s and repo path:%s',
          file,
          this.path
        )
      )
    }
  }

  /**
   * Get the relative path from repository root
   *
   * @method getRelativePath
   * @param {} fullPath
   * @return String
   */
  getRelativePath (fullPath) {
    if (path.sep === '\\') {
      fullPath = fullPath.replace(/\//g, path.sep)
    }
    if (!fullPath.startsWith(this.path)) return fullPath
    try {
      var relPath = path.relative(this.path, fullPath)
      return relPath
    } catch (e) {
      throw new Error(
        util.format(
          'Error getting relative path for file:%s and repo path:%s',
          fullPath,
          this.path
        )
      )
    }
  }

  /**
   * Is this file OK?  Implemented in mixins
   *
   * @method fileOK
   * @param {} file
   * @param {} includeDirs
   * @return stat
   */
  // READY Refactor fileOK to use async/await
  // #esm-migration #urgent
  async fileOK (file, includeDirs) {
    inMixinsNoop()
  }

  setIgnores (ignores) {
    // console.info('ignore patterns:', ignores)
    this.ignorePatterns = ignores
    this.ignore = ignore().add(ignores)
  }

  /**
   * Should the relative path be included.
   *
   * @method shouldInclude
   * @param {} relPath
   * @return exclude
   */
  shouldInclude (relPath) {
    relPath = this.getRelativePath(relPath)
    let include = true
    if (this.config.markdownOnly && relPath) {
      include = File.isMarkdown(relPath)
    }
    if (this.ignore) {
      try {
        include = include && (relPath === '' || !this.ignore.ignores(relPath))
      } catch (e) {
        console.error(
          `Failed to check ignore status for dir: [${relPath}] in: [${this.path}]. It will be included.`,
          e
        )
      }
    }

    return include
  }

  /**
   * Add or replace a file in the files reference array
   *
   * @method addFile
   * @param {} file
   * @return MemberExpression
   */
  // READY Refactor addFile to use async/await
  // #esm-migration #urgent
  async addFile (file) {
    if (this.destroyed) throw new Error('destroyed')
    const ok = await this.fileOK(file)
    if (!ok) return this.files
    let index = this.files.findIndex(({ path }) => path === file.path)
    if (index > -1) {
      this.files[index] = file
    } else {
      this.files.push(file)
    }

    return this.files
  }

  /**
   * Remove a file from the files reference array
   *
   * @method removeFile
   * @param {} file
   * @return MemberExpression
   */
  removeFile (file) {
    if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE)
    _remove(this.files, f => f.path === file.path)

    return this.files
  }

  /**
   * Description
   * @method getFile
   * @param {} path
   * @return CallExpression
   */
  getFile (path) {
    path = this.getRelativePath(path)
    return this.files.find((file) => file.path === path)
  }

  getTask (id) {
    if (Task.isTask(id)) {
      let task = id
      if (!task.meta.id) return
      return this.getTasks().find((existingTask) => {
        return existingTask.meta.id && existingTask.meta.id[0] == task.meta.id[0]
      })
    } else {
      let task = this.getTasks().find((task) => task.id === id)
      if (!task) return
      return this.getFile(task.source.path)
        .getTasks()
        .find((task) => task.id === id)
    }
  }

  /**
   * Description
   * @method getFileForTask
   * @param {} task
   * @return CallExpression
   */
  getFileForTask (task) {
    return this.getFile(task.getSource().path)
  }

  /**
   * Descriptione
   * @method getFiles
   * @param {} paths
   * @return CallExpression
   */
  getFiles (paths) {
    if (_isUndefined(paths)) return fastSort(this.files).asc(u => u.path)
    return this.files.filter((file) => {
      return paths.includes(file.path)
    })
  }

  getFilesWithTasks () {
    const files = this.files.filter((file) => file.getTasks().length > 0)
    return fastSort(files).asc(u => u.path)
  }

  resetFile (file) {
    file.reset()
    file.removeListener('task.found', this.taskFoundListener)
    file.removeListener('task.modified', this.taskModifiedListener)
  }

  // READY refactor extractTasks to use async/await
  // #esm-migration #urgent #important
  // <!--
  // order:-100
  // -->
  async extractTasks (file) {
    if (file.content === null) {
      await this.readFileContent(file)
    }
    file.on('task.found', this.taskFoundListener)
    file.on('task.modified', this.taskModifiedListener)
    const fileContent = file.content
    file.extractAndTransformTasks(self.getConfig())
    if (!file.isModified() || fileContent === file.content) {
      this.resetFile(file)
      return cb(null, file)
    }
    file.extractTasks(self.getConfig())
    if (file.modified) await self.writeFile(file)
    this.resetFile(file)
    return file
  }

  /**
   * Implemented in mixins
   * @method writeFile
   * @param {} file
   * @param {} cb
   * @return
   */
  async writeFile (file) {
    inMixinsNoop()
  }

  /**
   * Implemented in mixins
   * @method getFilesInPath
   * @param {} includeDirs
   * @return CallExpression
   */

  async getFilesInPath (includeDirs) {
    inMixinsNoop()
  }

  /**
   * Implemented in mixins
   * @method readFileContent
   * @param {} file
   * @return
   */
  async readFileContent (file) {
    inMixinsNoop()
  }

  // READY Refactor readFile to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-30
  // -->
  async readFile(file) {
    const checksum = this.checksum || function () {}
    if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE)
    if (file.deleted) return file

    var currentChecksum = file.checksum
    const filePath = file.path
    if (/\.\.(\/|\\)/.test(filePath)) throw new Error('Unable to read file:' + file)

    await this.readFileContent(file)
    file.checksum = checksum(file.getContent())
    file.updated = currentChecksum !== file.checksum
    if (!file.updated) return file

    await this.extractTasks(file)
    await this.addFile()

    return file
  }

  /**
   * Description
   * @method readFiles
   * @param {} files
   * @param {} cb
   * @return
   */
  // READY Refactor readFiles to use async/await
  // #esm-migration #urgent #important
  // <!--
  // order:-10
  // -->
  readFiles (files = this.files) {
    this.allMeta = {}
    this.metaKeys = new Set()
    this.allTags = new Set()
    this.allContexts = new Set()

    return new Promise(async (resolve, reject) => {

      if (files.length < 1) {
        files = this.files = await this.getFilesInPath(false)
        const filesToInclude = files.map((file) => file.path)
        const fileStats = {
          count: filesToInclude.length,
          files: filesToInclude,
        }
        this.emit('files.found', fileStats)
      }
      let completed = 0

      if (files.length < 1) return resolve()
      eachLimit(
        files,
        ASYNC_LIMIT,
        async (file) => {
          this.emit('file.reading', { path: file.path })
          await this.readFile(file)
          completed++
          self.emit('file.read', {path: file.path, completed: completed})
        },
        function (err) {
          if (err) return reject(err)
          resolve()
        }
      )
    })
  }

  /**
   * Implemented in mixins
   * @method deleteFile
   * @param {} path
   * @param {} cb
   * @return
   */
 async deleteFile (path, cb) {
    inMixinsNoop(cb)
  }

  /**
   * Description
   * @method hasDefaultFile
   * @return CallExpression
   */
  hasDefaultFile () {
    return _some(this.getFiles(), function (file) {
      var regex = new RegExp(DEFAULT_FILE_PATTERN, 'i')
      return regex.test(file.path)
    })
  }

  /**
   * Description
   * @method getDefaultFile
   * @return file
   */
  getDefaultFile () {
    var files = fastSort(this.getFiles()).asc(u => u.path)
    var file = files.reverse().find((file) => {
      var regex = new RegExp(DEFAULT_FILE_PATTERN, 'i')
      return regex.test(file.path)
    })
    return file
  }

  getList (name) {
    return this.getLists().find((list) => list.name === name)
  }


  getListById(id, lists = this.getLists()) {
    return lists.find((list) => list.id === id)
  }

  // READY Refactor hideList to use async/await
  // #esm-migration
  // <!--
  // order:-150
  // -->
  async hideList (name) {
    await this.setListHidden(name)
  }

  // READY Refactor showList to use async/await
  // #esm-migration
  // <!--
  // order:-230
  // -->
  async showList (name) {
    await this.setListHidden(name, false)
  }

  async setListHidden (name, hidden = true) {
    const list = this.getList(name)
    if (list) {
      list.hidden = hidden
      await this.saveConfig()
      self.emit('list.modified', name)
    }
  }

  /**
   * Description
   * @method moveList
   * @param {} name
   * @param {} pos
   * @param {} cb
   * @return
   */
  // READY Refactor moveList to use async/await
  // #esm-migration
  // <!--
  // order:-190
  // -->
  async moveList (name, pos) {
    var list = this.getList(name)
    if (list) {
      _remove(this.getLists(), { name: name })
      this.getLists().splice(pos, 0, list)
      await this.saveConfig()
      this.emit('list.modified', name)
    }
  }

  // READY Refactor toggleListIgnore to use async/await
  // #esm-migration
  // <!--
  // order:-250
  // -->
  async toggleListIgnore (name) {
    var list = this.getList(name)
    if (!list) return reject(new Error('List not found'))
    list.ignore = !list.ignore
    await this.updateList(list.id, list)
    await this.saveConfig()
    this.emit('list.modified', name)
  }

  async toggleList (name) {
    const list = this.getList(name)
    if (!list) throw new Error('List not found')
    list.hidden = !list.hidden
    await this.updateList(list.id, list)
    await this.saveConfig()
    this.emit('list.modified', name)
  }

  // READY Refactor updateList to use async/await
  // #esm-migration
  // <!--
  // order:-90
  // -->
  async updateList(id, {name, hidden, ignore, filter}) {
    const lists = this.getLists()
    const list = this.getListById(id, lists)
    const oldName = list.name
    const hasFilter = list.filter
    list.name = name
    list.hidden = hidden
    list.ignore = ignore
    if (hasFilter !== undefined) list.filter = filter
    this.setLists(lists)

    if (oldName === name || hasFilter) {
      return await this.saveConfig()
    }

    await this.moveTasksBetweenLists(oldName, name)
  }

  getTasksByFile(tasks) {
    const tasksByFile = {} // path: [files]
    tasks.forEach((task) => {
      const filePath = task.path
      if (!tasksByFile[filePath]) {
        tasksByFile[filePath] = { file: this.getFileForTask(task), tasks: [] }
      }
      tasksByFile[filePath].tasks.push(task)
      tasksByFile[filePath].tasks = fastSort(tasksByFile[filePath].tasks).desc(u => u.line)
    })
    return tasksByFile
  }
  // READY Refactor moveTasksBetweenLists to use async/await
  // <!--
  // #esm-migration #needs-testing
  // order:-80
  // -->
  // ## Tasks
  // - [x] Refactor
  // - [ ] Test
  async moveTasksBetweenLists(oldName, newName) {
    return new Promise((resolve, reject) => {
      const tasksToModify = this.getTasksInList(oldName)
      const tasksByFile = this.getTasksByFile(tasksToModify) // { <path/to/file>: {file, tasks} }

      const modifyTasksFunctions = Object.values(tasksByFile).map(({ file, tasks }) => {
        return async (cb) => {
          await this.readFileContent(file)
          try {
            tasks.forEach((task) => {
              task.list = newName
              file.modifyTask(task, this.getConfig(), true)
              file.modified = true
            })
          } catch (err) {
            return cb(err)
          }
          cb()
        }
      })

      if (modifyTasksFunctions.length < 1) return resolve()
      this.moving = true
      parallel(modifyTasksFunctions, async (err) => {
        this.moving = false
        if (err) {
          tasksByFile.forEach(({ file }) => this.resetFile(file))
          return reject(err)
        }
        try {
          await this.saveConfig()
          await this.saveModifiedFiles()
          resolve()  
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  // READY Migrate writeAndExtract to use async/await
  // #esm-migration
  // <!--
  // order:-80
  // -->
  async writeAndExtract (file, emit) {
    try {
      await this.writeFile(file, emit)
    } catch (err) {
      new Error('Unable to write file:' + file.path, {cause: err})
    }

    try {
      await this.extractTasks(file)
    } catch (err) {
      new Error('Unable to extract tasks for file:' + file.path, { cause: err })
    }

    try {
      await this.addFile(file)
    } catch (err) {
      new Error('Unable to add file after extracting tasks: ' + file.path, { cause: err })
    }

    return file
  }

  // READY Refactor writeAndAdd to use async/await
  // #esm-migration
  // <!--
  // order:-70
  // -->
  async writeAndAdd (file, emit) {
    await this.writeFile(file, emit)
    await this.addFile(file)
  }

  // READY Refactor deleteTask to use async/await
  // #esm-migration
  // <!--
  // order:-130
  // -->
  async deleteTask (task, cb) {
    let  file = this.getFileForTask(task)
    if (!file) return

    if (!file.getContent()) {
      file = await this.readFileContent(file)
    }

    file.deleteTask(task, this.getConfig())
    if (file.getContentForFile().trim() === '' && file.isMarkDownFile()) {
      if (file.deleted) return
      console.log('Deleting empty file:', file.path)
      this.deleteFile(file.path)
      file.deleted = true
      return
    }
    await this.writeAndExtract(file, true)
  }

  // READY Refactor deleteTasks to use async/await
  // #esm-migration
  // <!--
  // order:-140
  // -->
  async deleteTasks(tasks) {
    const files = {}
    tasks.forEach((task) => {
      if (!files[task.source.path]) {
        files[task.source.path] = []
      } 
      files[task.source.path].push(task)
      files[task.source.path] = fastSort(files[task.source.path]).desc(u => u.line)
    })

    await Promise.all(
      Object.keys(files).map(async (path) => {
        const file = files[path]
        if (!file) return
        task = newCard(task, this.project, true)
        await this.deleteTask(task)
      })
    )

    this.emit('tasks.updated', tasks)
  }

  // READY Refactor modifyTaskFromHtml to use async/await
  // #esm-migration
  // <!--
  // order:-170
  // -->
  async modifyTaskFromHtml (task, html) {
    var file = this.getFileForTask(task)
    if (!file.getContent()) {
      file = await this.readFileContent(file)
    }
    file.modifyTaskFromHtml(task, html)
    return await this.writeAndExtract(file, true)
  }

  // READY Refactor modifyTaskFromContent to use async/await
  // #esm-migration
  // <!--
  // order:-180
  // -->
  async modifyTaskFromContent (task, content, cb) {
    var file = this.getFileForTask(task)
    if (!file.getContent()) {
      file = await this.readFileContent(file)
    }
    
    file.modifyTaskFromContent(task, content, this.getConfig())
    return await this.writeAndExtract(file, true)
  }

  getTaskContent({
    description,
    order,
    text,
    taskPrefix,
    taskSyntax,
  }) {
    const task = newCard(
      {
        description,
        meta: {},
        order,
        text,
        beforeText: taskPrefix,
        type: taskSyntax,
      },
      this.project
    )
    Task.prototype.updateOrderMeta.apply(task, [this.config])
    return task.description.join(eol.lf)
  }

  appendTask({file, content, list}, cb) {
    const config = this.getConfig()
    const interpretedTaskPrefix = _template(config.getTaskPrefix())({
      date: new Date(),
    }).trimEnd()
    const lines = eol.split(content)
    const text = lines[0]
    const taskSyntax = config.getNewCardSyntax()
    const taskPrefix = interpretedTaskPrefix ? `${interpretedTaskPrefix} ` : ''
    let fileContent = file.getContent()
    const journalTemplate = this.getConfig().journalTemplate
    fileContent = fileContent.trim()
      ? fileContent
      : journalTemplate
        && journalTemplate.trim()
        ? journalTemplate + String(eol.lf)
        : '';

    const length = fileContent.length
    const fileIsEmpty = length < 1
    const crlf = String(eol.crlf)
    let sep = fileContent.indexOf(crlf) > -1 ? crlf : String(eol.lf)
    if (fileContent.endsWith(sep) || fileIsEmpty) sep = ''
    const order = appContext().projectContext.getOrder(list)
    const description = lines.length > 1 ? Task.padDescription(lines.slice(1), taskPrefix) : []
    const { orderMeta, tokenPrefix } = config
    const rawTask = getRawTask({tokenPrefix, orderMeta, list, order, text, type: taskSyntax})      
    const taskContent = config.orderMeta
    ? this.getTaskContent({
        description,
        order,
        text,
        taskPrefix,
        taskSyntax,
      })
    : description.join(eol.lf)

    let appendContent = File.trimBlankLines(
      `${taskPrefix}${rawTask}${eol.lf}${taskContent}`
    )
    
    fileContent = `${fileContent}${sep}`
    const cardTerminator = "\n".repeat(2)
    file.setContent(`${fileContent}${appendContent}${cardTerminator}`)

    this.writeAndExtract(file, true, (err, file) => {
      if (err) return cb(err)
      const task = file.getTasks().find(task => task.text === text && task.list === list)
      cb(null, file, task)
    })
  }

  // Refactor addTaskToFile to use async/await
  // #esm-migration
  async addTaskToFile (filePath, list, content, cb) {
    return new Promise((resolve, reject) => {
      this._addTaskToFile(filePath, list, content, (err, file, task) => {
        if (err) return cb ? cb(err) : reject(err)
        return cb ? cb(null, file, task) : resolve({ file, task })
      })
    })
  }

  _addTaskToFile (filePath, list, content, cb) {
    cb = tools.cb(cb)
    const relPath = this.getRelativePath(filePath)
    let file = this.getFile(relPath)

    if (file) {
      this.readFileContent(file, (err, file) => {
        if (err) return cb(err)
        this.appendTask({file, content, list}, cb)
      })
    } else {
      const modifiedTime = new Date()
      const createdTime = new Date()
      file = new File({
        repoId: this.path,
        filePath: relPath,
        content: '',
        modifiedTime,
        createdTime,
        project: this.project,
      })
      this.appendTask({file, content, list}, cb)
    }
  }

  /**
   * Description
   * @method modifyTask
   * @param {} task
   * @return CallExpression
   */
  // READY Refactor modifyTask to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-60
  // -->
  async modifyTask (task, writeFile = false) {
    if (!Task.isTask(task)) return
    const config = this.getConfig()
    log(
      'Modifying Task... text:%s list:%s order:%d path:%s id:%s line:%d',
      task.text,
      task.list,
      task.order,
      task.source.path,
      task.id,
      task.line
    )
    let beforeModifyContent
    const file = this.getFileForTask(task)
    try {
      beforeModifyContent = file.getContent()
    } catch (e) {
      console.error(`Can't get file for task: {text:'${task.text}', path:'${task.source.path}', line:${task.line}}`)
      throw e
    }

    if (!beforeModifyContent) await readFileContent(file)
    file.modifyTask(task, config, true)
    file.extractTasks(config)
    file.transformTask({config, modify:true, task})
    file.extractTasks(config)

    if (!writeFile || beforeModifyContent === file.getContent()) return task

    return await this.writeAndAdd(file)
  }

  // READY Refactor moveTask to use async/await
  // #esm-migration
  // <!--
  // order:-200
  // -->
  async moveTask ({ task, newList, newPos }) {
    if (!Task.isTask(task)) {
      task = newCard(task, this.project, true)
    }
    task = this.getTask(task.id)

    var toListTasks = this.getTasksInList(newList)
    if (toListTasks === undefined)
      throw new Error(ERRORS.LIST_NOT_FOUND, newList)

    var fromListTasks = this.getTasksInList(task.list)
    if (fromListTasks === undefined)
      throw new Error(ERRORS.LIST_NOT_FOUND, task.list)

    var sameList = newList == task.list
    if (!sameList) task.oldList = task.list
    task.list = newList

    // Move the task to the correct position in the list
    fromListTasks = _reject(fromListTasks, function (_task) {
      return _task.equals(task)
    })
    toListTasks = _reject(toListTasks, function (_task) {
      return _task.equals(task)
    })
    
    const tasksToModify = getTasksToModify(task, toListTasks, newPos)
    task.updateOrderMeta(this.config)
    toListTasks.splice(newPos, 0, task)

    const tasksToModifySorted = fastSort(tasksToModify).by([{ desc: u => u.line }, { asc: u => u.path }])
    
    return new Promise((resolve, reject) => {
      eachSeries(
        tasksToModifySorted,
        (task, cb) => {
          this.modifyTask(task, true, cb)
        },
        (err) => {
          if (err) return reject(err)
          resolve(task)
        }
      )
    })
  }

  // READY Refactor moveTasks to use async/await
  // #esm-migration
  // <!--
  // order:-210
  // -->
  _moveTasks (tasks, newList, newPos = 0, noEmit, cb) {
    var log = require('debug')('moveTasks')
    var self = this
    if (this.getList(newList).filter)
      return cb(new Error(`Tasks can\'t be moved to a filtered list ${newList}.`))
    var listsModified = [newList]
    if (_isFunction(noEmit)) {
      cb = noEmit
      noEmit = false
    }
    this.moving = true
    cb = tools.cb(cb)

    log('Move tasks to list:%s at position:%d : %j', newList, newPos, tasks)
    log(
      'newList before mods:',
      JSON.stringify(self.getTasksInList(newList), null, 3)
    )
    fastSort(tasks).by({desc: t => t.line})
    series(
      tasks.map((task, i) => {
        return async function () {
          const foundTask  = self.getTasks().find(({source, line}) => task.source.path === source.path && task.line === line)
          if (foundTask) {
            if (listsModified.indexOf(foundTask.list) < 0) listsModified.push(foundTask.list)
            await self.moveTask({ task: foundTask, newList, newPos: newPos + i, noEmit: true })
          } 
        }
      }),
      function (err) {
        if (err) {
          console.error('Error occurred while moving tasks:', err)
        }
        self.saveModifiedFiles(function (err, results) {
          if (err)
            console.error('Error occurred while saving modified files:', err)
          self.lastMovedFiles = results
          var tasksByList = listsModified.map((list) => {
            return {
              list: list,
              tasks: self.getTasksInList(list),
            }
          })
          self.moving = false
          cb(err, tasksByList)
          if (!err && !noEmit) self.emit('tasks.moved', tasks)
        })
      }
    )
  }

  // READY Replace use of this for moveTasks
  // #esm-migration
  // <!--
  // order:-260
  // -->
  async moveTasks (tasks, newList, newPos, noEmit = false) {
    return new Promise((resolve, reject) => {
      this._moveTasks(tasks, newList, newPos, noEmit, (err, tasksByList) => {
        if (err) return reject(err)
        resolve(tasksByList)
      })
    })
  }

  getModifiedFiles () {
    var filesToSave = []
    this.getFiles().forEach((file) => {
      if (file.isModified()) filesToSave.push(file)
    })
    return filesToSave
  }

  // READY Refactor saveModifiedFiles to use async/await
  // #esm-migration #urgent #important
  // <!--
  // order:-110
  // -->
  async saveModifiedFiles () {
    const checksum = this.checksum || function () {}
    var filesToSave = this.getModifiedFiles()
    var funcs = filesToSave.map((file) => {
      return async () => {
        file.checksum = checksum(file.getContent())
        await this.writeAndExtract(file, false)
      }
    })

    if (funcs.length < 1) return

    this.savingFiles = true
    await Promise.all(funcs)
    this.savingFiles = false
    self.emit('files.saved', filesToSave)
  }

  /**
   * Description
   * @method getTasks
   * @return tasks
   */
  getTasks () {
    var tasks = [],
      self = this
    this.getFiles().forEach((file) => {
      Array.prototype.push.apply(tasks, file.getTasks())
    })

    return tasks
  }

  getTasksByList (noSort) {
    return Repository.getTasksByList(this, this.getTasks(), noSort, true)
  }

  /**
   * Description
   * @method getTasksInList
   * @param {} name
   * @return ConditionalExpression
   */
  getTasksInList (name, offset, limit) {
    if (!_isString(name)) return []
    var tasks = _where(this.getTasks(), { list: name })
    if (tasks.length === 0) return []
    var allTasks = fastSort(tasks).by(DEFAULT_SORT)
    if (isNumber(offset) && isNumber(limit))
      return allTasks.slice(offset, offset + limit)
    return allTasks
  }

  getTaskIndex (task) {
    const tasks = this.getTasksInList(task.list)
    let index = 0
    tasks.forEach((t, i) => {
      if (t.id === task.id) index = i
    })
    return index
  }

  query (queryString) {
    const result = Repository.query(this.getTasks(), queryString)
    return Repository.getTasksByList(this, result, true)
  }
}