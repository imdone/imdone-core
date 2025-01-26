'use strict'

var _isFunction = require('lodash.isfunction'),
  _isUndefined = require('lodash.isundefined'),
  _isString = require('lodash.isstring'),
  _omit = require('lodash.omit'),
  _reject = require('lodash.reject'),
  _noop = require('lodash.noop'),
  _some = require('lodash.some'),
  _remove = require('lodash.remove'),
  _groupBy = require('lodash.groupby'),
  _where = require('lodash.where'),
  _template = require('lodash.template'),
  _union = require('lodash.union'),
  events = require('events'),
  languages = require('./languages'),
  util = require('util'),
  async = require('async'),
  path = require('path'),
  ignore = require('ignore'),
  File = require('./file'),
  Config = require('./config'),
  eol = require('eol'),
  tools = require('./tools'),
  inMixinsNoop = tools.inMixinsNoop,
  constants = require('./constants'),
  log = require('debug')('imdone-core:Repository'),
  List = require('./list'),
  monquery = require('monquery'),
  sift = require('sift'),
  fastSort = require('fast-sort/dist/sort.js'),
  JSONfns = require('json-fns'),
  Task = require('./task'),
  newCard = require('./card'),
  { replaceDateLanguage } = require('./adapters/parsers/DateLanguageParser'),
  { getRawTask, isNumber } = require('./adapters/parsers/task/CardContentParser')


const appContext = require('./context/ApplicationContext')
const get = require('lodash.get')

var ERRORS = constants.ERRORS,
  DEFAULT_FILE_PATTERN = constants.DEFAULT_FILE_PATTERN,
  ASYNC_LIMIT = constants.ASYNC_LIMIT,
  DEFAULT_SORT = [{ asc: u => u.order }, { asc: u => u.text }]

// Emits task.found, list.found, file.update and file.delete, file.processed, files.saved

/**
 * A Repository is a file system directory in which to look for tasks in files.  The Repository manages all the files
 * and lists in it's path.
 *
 * @constructor
 * @param {} path
 * @param {} config
 * @return
 */

function Repository(_path, config) {
  var self = this

  events.EventEmitter.call(this)
  // path is the root path of the repository
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

util.inherits(Repository, events.EventEmitter)

Repository.prototype.init = function (cb) {
  cb(null)
}

Repository.prototype.refresh = function (cb) {
  cb = tools.cb(cb)
  this.loadConfig((err, config) => {
    if (err) {
      return cb(err)
    }
    this.config = config
    this.files = []
    this.allMeta = {}
    this.metaKeys = new Set()
    this.allTags = new Set()
    this.allTopics = new Set()
    this.allContexts = new Set()
    this.readFiles((err, files) => {
      if (err) {
        this.emit('initialized', { ok: false })
        return cb(err)
      }
      this.emit('initialized', { ok: true, lists: this.getTasksByList() })
      if (cb) cb(err, files)
    })
  })
}

/**
 * Description
 * @method destroy
 * @return
 */
Repository.prototype.destroy = function () {
  this.destroyed = true
  this.removeAllListeners()
}

/**
 * Description
 * @method getId
 * @return CallExpression
 */
Repository.prototype.getId = function () {
  return this.getPath()
}

Repository.prototype.getProject = function () {
  return this.project
}

Repository.prototype.getDisplayName = function () {
  return path.basename(this.path)
}

Repository.prototype.emitFileUpdate = function (file, force) {
  if (force || this.shouldEmitFileUpdate(file)) this.emit('file.update', file)
}

Repository.prototype.shouldEmitFileUpdate = function (file) {
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

Repository.prototype.emitConfigUpdate = function (data) {
  if (this.savingConfig) return
  process.nextTick(() => {
    this.emit('config.update', data)
  })
}

/**
 * Description
 * @method createListeners
 * @return
 */
Repository.prototype.createListeners = function () {
  if (this.taskListener) return
  var self = this
  /**
   * Description
   * @method taskFoundListener
   * @param {} task
   * @return
   */
  this.taskListener = function (event, task) {
    if (!self.listExists(task.list) && self.config.includeList(task.list)) {
      const list = new List({ name: task.list })
      self.addList(list)
      self.emit('list.found', list)
      self.saveConfig()
    }
    Object.keys(task.allMeta).forEach(key => self.metaKeys.add(key))
    task.topics.forEach(topic => self.allTopics.add(topic))
    task.allTags.forEach(tag => self.allTags.add(tag))
    task.allContext.forEach(context => self.allContexts.add(context))
    self.allMeta = self.addAllMeta(task.allMeta)
    self.emit(event, task)
  }

  this.taskFoundListener = function (task) {
    self.taskListener('task.found', task)
  }

  this.taskModifiedListener = function (task) {
    self.taskListener('task.modified', task)
  }
}

Repository.prototype.addAllMeta = function (meta) {
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
Repository.prototype.addList = function (list, cb) {
  cb = tools.cb(cb)
  if (this.listExists(list.name)) return cb()
  var self = this
  var fn = function (err) {
    if (!err) self.emit('list.modified', list)
    cb(err)
  }
  list = _omit(list, 'tasks')
  this.config.lists.push(new List(list))
  if (!list.filter && !/[a-z]/.test(list.name)) {
    const codeList = list.name.replace(/\s+/g, '-').toUpperCase()
    if (!this.config.code.include_lists.find((name) => name === codeList)) {
      this.config.code.include_lists.push(codeList)
    }
  }
  this.saveConfig(fn)
}

Repository.prototype.removeList = function (list, cb) {
  return new Promise((resolve, reject) => {
    var fn = (err) => {
      if (err) return cb && cb(err) || reject(err)
      this.emit('list.modified', list)
      resolve()
    }
    if (!this.listExists(list)) return fn()

    var lists = _reject(this.getLists(), { name: list })
    if (this.config.code && this.config.code.include_lists) {
      this.config.code.include_lists = _reject(this.config.code.include_lists, list)
    }
    this.setLists(lists)
    this.saveConfig(fn)
  })
}

/**
 * Description
 * @method getPath
 * @return MemberExpression
 */
Repository.prototype.getPath = function () {
  return this.path
}

/**
 * Description
 * @method getConfig
 * @return MemberExpression
 */
Repository.prototype.getConfig = function () {
  return this.config
}

/**
 * Description
 * @method getLists
 * @return MemberExpression
 */
Repository.prototype.getLists = function () {
  return this.getConfig().lists
}

Repository.prototype.getVisibleLists = function () {
  return _reject(this.getLists(), 'hidden')
}

Repository.prototype.isListVisible = function (name) {
  return this.getVisibleLists.find((list) => list.name === name)
}

/**
 * Description
 * @method setLists
 * @param {} lists
 * @return ThisExpression
 */
Repository.prototype.setLists = function (lists) {
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
Repository.prototype.listExists = function (name) {
  return this.getConfig().listExists(name)
}

/**
 * Save the config file (Implemented in mixins)
 *
 * @method saveConfig
 * @param {} cb
 * @return
 */
Repository.prototype.saveConfig = function (cb) {
  inMixinsNoop(cb)
}

/**
 * Load the config file (Implemented in mixins)
 *
 * @method loadConfig
 * @return MemberExpression
 */
Repository.prototype.loadConfig = function (cb) {
  inMixinsNoop(cb)
}

Repository.prototype.migrateTasksByConfig = function (
  oldConfig,
  newConfig,
  cb
) {
  if (!oldConfig || !newConfig) return cb()
  const oldMetaSep = oldConfig.getMetaSep()
  const newMetaSep = newConfig.getMetaSep()
  if (oldMetaSep === newMetaSep) return cb()
  async.eachLimit(
    this.getFiles(),
    ASYNC_LIMIT,
    (file, cb) => {
      const tasks = fastSort(file.tasks).desc(u => u.line)
      async.eachSeries(
        tasks,
        (task, cb) => {
          if (!Task.isTask(task)) return cb()
          task.replaceMetaSep(oldMetaSep, newMetaSep)
          this.modifyTask(task, false, cb)
        },
        (err) => {
          if (err) return cb(err)
          if (!file.isModified() || file.getContent().trim() === '') return cb()
          this.writeFile(file, (err, file) => {
            this.resetFile(file)
            if (err) return cb(err)
            cb(null, file)
          })
        }
      )
    },
    cb
  )
}

/**
 * Get the full path from a relative path
 *
 * @method getFullPath
 * @param {} file
 * @return String
 */
Repository.prototype.getFullPath = function (file) {
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
Repository.prototype.getRelativePath = function (fullPath) {
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
Repository.prototype.fileOK = function (file, includeDirs, cb) {
  if (_isFunction(includeDirs)) cb = includeDirs
  cb(null, true)
}

Repository.prototype.setIgnores = function (ignores) {
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
Repository.prototype.shouldInclude = function (relPath) {
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
Repository.prototype.addFile = function (file, cb) {
  if (this.destroyed) return cb(new Error('destroyed'))
  var self = this
  this.fileOK(file, function (err, ok) {
    if (err) return cb(err)
    if (ok) {
      var index = self.files.findIndex(({ path }) => path === file.path)
      if (index > -1) {
        self.files[index] = file
      } else {
        self.files.push(file)
      }
    }
    cb(err, self.files)
  })
}

/**
 * Remove a file from the files refrence array
 *
 * @method removeFile
 * @param {} file
 * @return MemberExpression
 */
Repository.prototype.removeFile = function (file) {
  if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE)
  this.files = _reject(this.files, { path: file.path })

  return this.files
}

/**
 * Description
 * @method getFile
 * @param {} path
 * @return CallExpression
 */
Repository.prototype.getFile = function (path) {
  return this.files.find((file) => file.path === path)
}

Repository.prototype.getTask = function (id) {
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
Repository.prototype.getFileForTask = function (task) {
  return this.getFile(task.getSource().path)
}

/**
 * Descriptione
 * @method getFiles
 * @param {} paths
 * @return CallExpression
 */
Repository.prototype.getFiles = function (paths) {
  if (_isUndefined(paths)) return fastSort(this.files).asc(u => u.path)
  return this.files.filter((file) => {
    return paths.includes(file.path)
  })
}

Repository.prototype.getFilesWithTasks = function () {
  const files = this.files.filter((file) => file.getTasks().length > 0)
  return fastSort(files).asc(u => u.path)
}

Repository.prototype.resetFile = function (file) {
  file.reset()
  file.removeListener('task.found', this.taskFoundListener)
  file.removeListener('task.modified', this.taskModifiedListener)
}

Repository.prototype.extractTasks = function (file, cb) {
  cb = tools.cb(cb)
  var self = this
  var extract = (file) => {
    file.on('task.found', self.taskFoundListener)
    file.on('task.modified', self.taskModifiedListener)
    const fileContent = file.content
    file.extractAndTransformTasks(self.getConfig())
    if (!file.isModified() || fileContent === file.content) {
      this.resetFile(file)
      return cb(null, file)
    }
    file.extractTasks(self.getConfig())
    self.writeFile(file, (err, file) => {
      this.resetFile(file)
      if (err) return cb(err)
      cb(null, file)
    })
  }

  if (file.content === null) {
    this.readFileContent(file, function (err, file) {
      if (err) return cb(err)
      extract(file)
    })
  } else extract(file)
}

/**
 * Implemented in mixins
 * @method writeFile
 * @param {} file
 * @param {} cb
 * @return
 */
Repository.prototype.writeFile = function (file, cb) {
  inMixinsNoop(cb)
}

/**
 * Implemented in mixins
 * @method getFilesInPath
 * @param {} includeDirs
 * @return CallExpression
 */

Repository.prototype.getFilesInPath = function (includeDirs, cb) {
  inMixinsNoop(cb)
}

/**
 * Implemented in mixins
 * @method readFileContent
 * @param {} file
 * @param {} cb
 * @return
 */
Repository.prototype.readFileContent = function (file, cb) {
  inMixinsNoop(cb)
}

/**
 * Description
 * @method readFile
 * @param {} file
 * @param {} cb
 * @return
 */
Repository.prototype.readFile = function (file, cb) {
  const checksum = this.checksum || function () {}
  cb = tools.cb(cb)
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE))
  if (file.deleted) return cb(null, file)
  var self = this

  var currentChecksum = file.checksum
  const filePath = file.path
  if (!/\.\.(\/|\\)/.test(filePath)) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(new Error('Unable to read file:' + filePath))
      // BACKLOG Allow user to assign a module for content transformation
      // <!--
      // order:-800
      // -->
      file.checksum = checksum(file.getContent())
      file.updated = currentChecksum !== file.checksum
      if (file.updated)
        self.extractTasks(file, (err) => {
          if (err) return cb(err)
          self.addFile(file, (err) => {
            if (err) log('error:', err)
            log(`File added. repo: ${self.getPath()} file-path: ${file.path}`)
            if (err) return cb(err)
            cb(null, file)
          })
        })
      else cb(null, file)
    })
  } else return cb(new Error('Unable to read file:' + file))
}

/**
 * Description
 * @method readFiles
 * @param {} files
 * @param {} cb
 * @return
 */
Repository.prototype.readFiles = function (files, cb) {
  if (arguments.length === 0) {
    cb = _noop
    files = undefined
  } else if (_isFunction(files)) {
    cb = files
    files = undefined
  } else if (files && !Array.isArray(files))
    return cb(new Error('files must be an array of files or undefined'))

  cb = tools.cb(cb)

  var self = this

  this.allMeta = {}
  this.metaKeys = new Set()
  this.allTags = new Set()
  this.allContexts = new Set()

  var exec = function (files) {
    var completed = 0
    if (files.length < 1) return cb(null, [])
    async.eachLimit(
      files,
      ASYNC_LIMIT,
      function (file, cb) {
        self.emit('file.reading', { path: file.path })
        self.readFile(file, function (err, file) {
          if (err) return cb(err)
          completed++
          self.emit('file.read', {
            path: file.path,
            completed: completed,
          })
          cb()
        })
      },
      function (err) {
        cb(err, files)
      }
    )
  }

  if (files === undefined) {
    if (this.files && this.files.length > 0) {
      exec(this.files)
    } else {
      this.getFilesInPath(false, (err, files) => {
        if (err) return cb(err)
        self.files = files
        const filesToInclude = files.map((file) => file.path)
        const fileStats = {
          count: filesToInclude.length,
          files: filesToInclude,
        }
        this.emit('files.found', fileStats)
        exec(files)
      })
    }
  } else exec(files)
}

/**
 * Implemented in mixins
 * @method deleteFile
 * @param {} path
 * @param {} cb
 * @return
 */
Repository.prototype.deleteFile = function (path, cb) {
  inMixinsNoop(cb)
}

/**
 * Description
 * @method hasDefaultFile
 * @return CallExpression
 */
Repository.prototype.hasDefaultFile = function () {
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
Repository.prototype.getDefaultFile = function () {
  var files = fastSort(this.getFiles()).asc(u => u.path)
  var file = files.reverse().find((file) => {
    var regex = new RegExp(DEFAULT_FILE_PATTERN, 'i')
    return regex.test(file.path)
  })
  return file
}

Repository.prototype.getList = function (name) {
  return this.getLists().find((list) => list.name === name)
}


Repository.prototype.getListById = function(id) {
  return this.getLists().find((list) => list.id === id)
}

Repository.prototype.hideList = function (name, cb) {
  var self = this
  cb = tools.cb(cb)
  var fn = function (err) {
    if (!err) self.emit('list.modified', name)
    cb(err)
  }

  var list = this.getList(name)
  if (list) {
    list.hidden = true
    this.saveConfig(fn)
  } else cb()
}

Repository.prototype.showList = function (name, cb) {
  var self = this
  cb = tools.cb(cb)
  var fn = function (err) {
    if (!err) self.emit('list.modified', name)
    cb(err)
  }

  var list = this.getList(name)
  if (list) {
    list.hidden = false
    this.saveConfig(fn)
  } else cb()
}

/**
 * Description
 * @method moveList
 * @param {} name
 * @param {} pos
 * @param {} cb
 * @return
 */
Repository.prototype.moveList = function (name, pos, cb) {
  var self = this
  cb = tools.cb(cb)
  var list = this.getList(name)
  // Only modify the lists if the list name exists
  var fn = function (err) {
    if (!err) self.emit('list.modified', name)
    cb(err)
  }

  if (list) {
    _remove(this.getLists(), { name: name })
    this.getLists().splice(pos, 0, list)
    this.saveConfig(fn)
  } else cb()
}

Repository.prototype.toggleListIgnore = function (name, cb) {
  var self = this
  cb = tools.cb(cb)
  var list = this.getList(name)
  // Only modify the lists if the list name exists
  var fn = function (err) {
    if (!err) self.emit('list.modified', name)
    cb(err)
  }

  if (list) {
    list.ignore = !list.ignore
    this.saveConfig(fn)
  } else cb()
}

Repository.prototype.toggleList = function (name, cb) {
  var self = this
  cb = tools.cb(cb)
  var list = this.getList(name)
  // Only modify the lists if the list name exists
  var fn = function (err) {
    if (!err) self.emit('list.modified', name)
    cb(err)
  }

  if (list) {
    list.hidden = !list.hidden
    this.saveConfig(fn)
  } else cb()
}

Repository.prototype.updateList = function(id, {name, filter}) {
  return new Promise((resolve, reject) => {
    if (!filter && this.listExists(name)) return resolve()

    const lists = this.getLists()
    const list = this.getListById(id)
    const oldName = list.name
    const oldFilter = list.filter
    list.name = name
     if (oldFilter) list.filter = filter
    this.setLists(lists)

    if (oldName === name || oldFilter) {
      this.saveConfig(err => {
        if (err) return reject(err)
        resolve()
      })
    } else {
      this.moveTasksBetweenLists(oldName, name, err => {
        if (err) return reject(err)
        resolve()
      })
    }
  })
}

Repository.prototype.moveTasksBetweenLists = function(oldName, newName, cb) {
  cb = tools.cb(cb)
  // Modify the tasks
  const tasksToModify = this.getTasksInList(oldName)

  const cbfn = (err) => {
    this.moving = false
    if (err) return cb(err)
    this.saveConfig((err) => {
      if (err) return cb(err)
      cb(null, { oldName, newName })
    })
  }

  const tasksByFile = {} // path: [files]
  tasksToModify.forEach((task) => {
    const filePath = task.path
    if (!tasksByFile[filePath]) {
      tasksByFile[filePath] = { file: this.getFileForTask(task), tasks: [] }
    }
    tasksByFile[filePath].tasks.push(task)
  })
  const modifyTasks = Object.values(tasksByFile).map(({ file, tasks }) => {
    return (cb) => {
      this.readFileContent(file, (err) => {
        if (err) return cb(err)
        try {
          tasks.forEach((task) => {
            task.list = newName
            file.modifyTask(task, this.getConfig(), true)
          })
        } catch (err) {
          return cb(err)
        }
        cb()
      })
    }
  })

  // BACKLOG Let's use saveModifiedFiles here id:15 gh:100 +fix
  // <!--
  // order:-810
  // -->

  this.moving = true
  if (modifyTasks.length > 0) {
    async.parallel(modifyTasks, (err) => {
      if (err) return cb(err)

      var fns = Object.values(tasksByFile).map(({ file }) => {
        return (cb) => {
          this.writeFile(file, cb)
        }
      })

      if (fns.length > 0) {
        async.parallel(fns, cbfn)
      } else {
        cbfn()
      }
    })
  } else cbfn()
}

Repository.prototype.writeAndExtract = function (file, emit, cb) {
  this.writeFile(file, emit, (err, file) => {
    if (err) return cb(new Error('Unable to write file:' + file.path))
    this.extractTasks(file, (err, file) => {
      if (err) {
        return cb(new Error('Unable to extract tasks for file:' + file.path))
      }
      
      this.addFile(file, (err) => {
        if (err) {
          err.message = `Unable to add file after extracting tasks: #{file.path}\n${err.message}` 
          return cb(err)
        }
        cb(null, file)
      })
    })
  })
}

Repository.prototype.writeAndAdd = function (file, emit, cb) {
  this.writeFile(file, emit, (err, file) => {
    if (err) return cb(new Error('Unable to write file:' + file.path))
    this.addFile(file, (err) => {
      if (err) return cb(new Error('Unable to add file:' + file.path))
      cb(null, file)
    })
  })
}

Repository.prototype.deleteTask = function (task, cb) {
  if (!cb) throw new Error('task, callback required')
  var self = this
  var file = self.getFileForTask(task)
  if (!file) return cb(null)
  const execute = function (file) {
    file.deleteTask(task, self.getConfig())
    if (file.getContentForFile().trim() === '' && file.isMarkDownFile()) {
      if (file.deleted) return
      console.log('Deleting empty file:', file.path)
      self.deleteFile(file.path, cb)
      file.deleted = true
      return
    }
    self.writeAndExtract(file, true, cb)
  }
  if (!file.getContent()) {
    self.readFileContent(file, function (err, file) {
      if (err) return cb(err)
      execute(file)
    })
  } else {
    execute(file)
  }
}
Repository.prototype.deleteTasks = function (tasks, cb) {
  if (!cb) throw new Error('tasks, callback required')
  var self = this

  let files = _groupBy(tasks, (task) => task.source.path) // {path:tasks, path2:tasks}
  for (let [path, tasks] of Object.entries(files)) {
    files[path] = fastSort(tasks).desc(u => u.line)
  }
  async.eachSeries(
    Object.entries(files),
    ([path, tasks], cb) => {
      const file = this.getFile(path)
      async.eachSeries(
        tasks,
        (task, cb) => {
          task = newCard(task, this.project, true)
          this.deleteTask(task, (err) => {
            cb(err || null, task)
          })
        },
        (err) => {
          cb(err)
        }
      )
    },
    (err) => {
      cb(err)
    }
  )
}

Repository.prototype.modifyTaskFromHtml = function (task, html, cb) {
  cb = tools.cb(cb)
  var file = this.getFileForTask(task)
  if (!file.getContent()) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err)
      file.modifyTaskFromHtml(task, html)
      this.writeAndExtract(file, true, cb)
    })
  } else {
    file.modifyTaskFromHtml(task, html)
    this.writeAndExtract(file, true, cb)
  }
}

Repository.prototype.modifyTaskFromContent = function (task, content, cb) {
  cb = tools.cb(cb)
  var file = this.getFileForTask(task)
  if (!file.getContent()) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err)
      file.modifyTaskFromContent(task, content, this.getConfig())
      this.writeAndExtract(file, true, cb)
    })
  } else {
    file.modifyTaskFromContent(task, content, this.getConfig())
    this.writeAndExtract(file, true, cb)
  }
}

Repository.prototype.getTaskContent = function({
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

Repository.prototype.appendTask = function({file, content, list}, cb) {
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

Repository.prototype.addTaskToFile = function (filePath, list, content, cb) {
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
Repository.prototype.modifyTask = function (task, writeFile, cb) {
  if (!Task.isTask(task)) return cb()
  if (_isFunction(writeFile)) {
    cb = writeFile
    writeFile = false
  }
  cb = tools.cb(cb)
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
  var self = this
  let beforeModifyContent
  var file = this.getFileForTask(task)
  try {
    beforeModifyContent = file.getContent()
  } catch (e) {
    console.error(
      `Can't get file for task: {text:'${task.text}', path:'${task.source.path}', line:${task.line}}`
    )
  }

  const modifyTransformExtract = (cb) => {
    file.modifyTask(task, config, true)
    file.extractTasks(config)
    file.transformTask({config, modify:true, task})
    file.extractTasks(config)

    if (!writeFile || beforeModifyContent === file.getContent()) return cb(null, task)

    this.writeAndAdd(file, cb)
  }

  if (!beforeModifyContent) {
    this.readFileContent(file, (err) => {
      if (err) return cb(err)
      modifyTransformExtract(cb)
    })
  } else {
    modifyTransformExtract(cb)
  }
}

Repository.prototype.setTaskPriority = function (_task, index, cb) {
  if (_task.order === '') return cb()
  _task.order = index * 10
  cb()
}

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

Repository.getPreviousIndexWithDifferentOrder = getPreviousIndexWithDifferentOrder

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

Repository.getNextIndexWithDifferentOrder = getNextIndexWithDifferentOrder

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

Repository.getTasksToModify = getTasksToModify

function tasksHaveSameOrder(taskA, taskB) {
  return taskA && taskB && taskA.order + "" === taskB.order + ""
}

Repository.prototype.moveTask = function ({ task, newList = task.list, newPos }, cb) {
  if (!Task.isTask(task)) {
    task = newCard(task, this.project, true)
  }
  task = this.getTask(task.id)

  var toListTasks = this.getTasksInList(newList)
  if (toListTasks === undefined)
    return cb(new Error(ERRORS.LIST_NOT_FOUND, newList))

  var fromListTasks = this.getTasksInList(task.list)
  if (fromListTasks === undefined)
    return cb(new Error(ERRORS.LIST_NOT_FOUND, task.list))

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
  async.eachSeries(
    tasksToModifySorted,
    (task, cb) => {
      this.modifyTask(task, true, cb)
    },
    (err) => {
      if (err)
        return cb([
          new Error(
            'moveTasks: Error while modifying tasks in the current list'
          ),
          err,
        ])
      cb(null, task)
    }
  )
}

Repository.prototype.moveTasks = function (tasks, newList, newPos = 0, noEmit, cb) {
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
  async.series(
    tasks.map((task, i) => {
      return function (cb) {
        const foundTask  = self.getTasks().find(({source, line}) => task.source.path === source.path && task.line === line)
        if (foundTask) {
          if (listsModified.indexOf(foundTask.list) < 0) listsModified.push(foundTask.list)
          self.moveTask({ task: foundTask, newList, newPos: newPos + i, noEmit: true }, cb)
        } else {
          cb()
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

Repository.prototype.moveTasksAsync = function (tasks, newList, newPos, noEmit = false) {
  return new Promise((resolve, reject) => {
    this.moveTasks(tasks, newList, newPos, noEmit, (err, tasksByList) => {
      if (err) return reject(err)
      resolve(tasksByList)
    })
  })
}

Repository.prototype.getModifiedFiles = function () {
  var filesToSave = []
  this.getFiles().forEach((file) => {
    if (file.isModified()) filesToSave.push(file)
  })
  return filesToSave
}

Repository.prototype.saveModifiedFiles = function (cb) {
  const checksum = this.checksum || function () {}
  var self = this
  var filesToSave = self.getModifiedFiles()
  var funcs = filesToSave.map((file) => {
    return function (cb) {
      file.checksum = checksum(file.getContent())
      self.writeAndExtract(file, false, cb)
    }
  })

  if (funcs.length < 1) return cb()
  this.savingFiles = true
  async.parallel(funcs, (err) => {
    this.savingFiles = false
    if (err) return cb(err)
    self.emit('files.saved', filesToSave)
    cb()
  })
}

/**
 * Description
 * @method getTasks
 * @return tasks
 */
Repository.prototype.getTasks = function () {
  var tasks = [],
    self = this
  this.getFiles().forEach((file) => {
    Array.prototype.push.apply(tasks, file.getTasks())
  })

  return tasks
}

Repository.prototype.getTasksByList = function (noSort) {
  return Repository.getTasksByList(this, this.getTasks(), noSort, true)
}

Repository.getTasksByList = function (
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

Repository.populateFilteredList = function (list, tasks) {
  try {
    list.tasks = Repository.query(tasks, list.filter).map((task) => {
      task.filteredListName = list.name
      return task
    })
  } catch (e) {
    list.tasks = []
  }
}

/**
 * Description
 * @method getTasksInList
 * @param {} name
 * @return ConditionalExpression
 */
Repository.prototype.getTasksInList = function (name, offset, limit) {
  if (!_isString(name)) return []
  var tasks = _where(this.getTasks(), { list: name })
  if (tasks.length === 0) return []
  var allTasks = fastSort(tasks).by(DEFAULT_SORT)
  if (isNumber(offset) && isNumber(limit))
    return allTasks.slice(offset, offset + limit)
  return allTasks
}

Repository.prototype.getTaskIndex = function (task) {
  const tasks = this.getTasksInList(task.list)
  let index = 0
  tasks.forEach((t, i) => {
    if (t.id === task.id) index = i
  })
  return index
}

Repository.prototype.serialize = function () {
  return JSON.stringify(this, null, 3)
}

// WARN: deprecated
Repository.deserialize = function (repo, cb) {
  cb = tools.cb(cb)
  repo = JSON.parse(repo)
  const config = new Config(repo.config)
  var newRepo = new Repository(repo.path, config)
  var count = 0
  repo.files.forEach((file) => {
    log('file:%j', file)
    newRepo.addFile(new File({ file, config, languages }), function (err) {
      if (err) return cb(err)
      count++
      log('count:%d, repo.files.length:%d', count, repo.files.length)
      if (count == repo.files.length) cb(null, newRepo)
    })
  })
}

Repository.regexQuery = function (tasks, queryString) {
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


Repository.parseSortFromQueryString = function (queryString) {
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

Repository.parseSortFromMongoQuery = function (mongoQuery) {
  const sort = []
  for (const [key, value] of Object.entries(mongoQuery.sort)) {
    if (value > 0) sort.push({ asc: key })
    else sort.push({ desc: key })
  }
  return sort
}

Repository.sortByQuery = function (tasks, queryString = '') {
  queryString = replaceDateLanguage(queryString)
  let { sort } = Repository.parseSortFromQueryString(queryString)
  if (!sort || sort.length === 0) sort = DEFAULT_SORT
  fastSort(tasks).by(sort)
}

Repository.filterCards = function (tasks, _queryString = '') {
  let query
  _queryString = replaceDateLanguage(_queryString)
  let { sort, queryString } = Repository.parseSortFromQueryString(_queryString)
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
    sort
  }
}

Repository.query = function (tasks, queryString) {
  return Repository.filterCards(tasks, queryString).result
}

Repository.replaceDatesInQuery = function (query) {
  return Repository.filterObjectValues(query, (key, value) => {
    let date = Date.parse(value)
    if (date && /(\d{4})-(\d{2})-(\d{2})/.test(value)) {
      return date
    }
    return value
  })
}

Repository.filterObjectValues = function (o, cb) {
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

Repository.prototype.query = function (queryString) {
  const result = Repository.query(this.getTasks(), queryString)
  return Repository.getTasksByList(this, result, true)
}

module.exports = Repository
