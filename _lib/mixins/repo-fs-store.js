'use strict'

var _path = require('path'),
  _cloneDeep = require('lodash.clonedeep'),
  _isFunction = require('lodash.isfunction'),
  _isUndefined = require('lodash.isundefined'),
  _assign = require('lodash.assign'),
  _remove = require('lodash.remove'),
  _union = require('lodash.union'),
  async = require('async'),
  checksum = require('checksum'),
  tools = require('../tools'),
  constants = require('../constants'),
  log = require('debug')('imdone-mixins:repo-fs-store'),
  File = require('../file'),
  Config = require('../config'),
  languages = require('../languages'),
  isBinaryFile = require('isbinaryfile'),
  eol = require('eol'),
  _eol = String(eol.auto),
  readdirp = require('readdirp'),
  _ignore = require('ignore'),
  fastSort = require('fast-sort/dist/sort.js'),
  Repository = require('../repository'),
  buildMigrateConfig = require('../migrate-config'),
  { loadYAML, dumpYAML } = require('../adapters/yaml')


module.exports = mixin

const {
  CONFIG_DIR,
  CONFIG_FILE,
  CONFIG_FILE_YML,
  DEFAULT_CONFIG,
  ASYNC_LIMIT,
  DEFAULT_IGNORE_PATHS,
  DEFAULT_IGNORE_EXTS,
  IGNORE_FILE,
  SORT_FILE,
  ERRORS,
} = constants

function mixin(repo, fs = require('fs')) {
  repo.checksum = checksum
  repo.allFiles = []

  function getIgnorePatterns() {
    var ignoreFile = _path.join(repo.path, IGNORE_FILE)
    let patterns = DEFAULT_IGNORE_PATHS
    if (fs.existsSync(ignoreFile))
      patterns = patterns + _eol + fs.readFileSync(ignoreFile).toString()

    return patterns
  }

  const IG = _ignore().add(getIgnorePatterns())

  function shouldIncludeFile(entry) {
    const { path, dirent } = entry
    return !dirent.isSymbolicLink() && !IG.ignores(path)
  }

  function getAllFilePaths(root, cb) {
    readdirp
      .promise(root, {
        lstat: true,
        fileFilter: shouldIncludeFile,
      })
      .then((entries) => cb(null, entries))
      .catch((error) => cb(error, []))
  }

  function ls(root, cb) {
    getAllFilePaths(root, function (error, files) {
      if (error) {
        console.error(`Error reading dir: ${root} `, error)
      }
      cb(
        null,
        files
          .filter((res) => repo.shouldInclude(res.path))
          .map((res) => res.fullPath)
      )
    })
  }

  repo.addFilePath = async function (path) {
    var relPath = repo.getRelativePath(path)
    var fullPath = repo.getFullPath(path)

    const stat = await fs.promises.lstat(fullPath)
    if (stat.isDirectory()) relPath += _path.sep
    if (!repo.allFiles.includes(relPath)) {
      repo.allFiles.push(relPath)
    }
  }

  repo.removeFilePath = function (path) {
    _remove(repo.allFiles, (item) => item === path)
  }

  repo.getFilePaths = function () {
    return repo.allFiles
  }

  const _init = repo.init
  repo.migrateConfig = buildMigrateConfig(repo)
  repo.init = function (cb) {
    _init.call(repo, (err) => {
      if (err && repo.destroyed) return cb(err)
      cb = tools.cb(cb)
      fs.stat(repo.path, function (err, stat) {
        if (err || !stat.isDirectory()) {
          var error = new Error(
            `Path must be an existing directory on the file system: ${repo.path}`
          )
          repo.emit('error', error)
          return cb(error)
        }

        repo.loadConfig((err) => {
          if (err) {
            repo.emit('error', err)
            return cb(err)
          }
          repo.migrateConfig()
          repo.saveConfig()
          repo.emit('config.loaded')
          repo.createListeners()
          repo.readFiles((err, files) => {
            if (err && repo.destroyed) return cb(err)
            repo.emit('initialized', { ok: true, lists: repo.getTasksByList() })
            cb(err, files)
          })
        })
      })
    })
  }

  repo.loadIgnore = function () {
    const patterns = getIgnorePatterns() + _eol + DEFAULT_IGNORE_EXTS
    repo.setIgnores(patterns)
  }

  repo.fileOK = function (file, includeDirs, cb) {
    if (File.isFile(file)) file = file.path
    if (_isFunction(includeDirs)) {
      cb = includeDirs
      includeDirs = false
    }
    cb = tools.cb(cb)
    try {
      if (!file || !this.shouldInclude(file)) return cb(null, false)
    } catch (e) {
      cb(e)
    }
    var fullPath = repo.getFullPath(file)
    fs.lstat(fullPath, function (err, stat) {
      if (err) {
        console.log(err)
        return cb(null, false)
      }
      if (/\.\.(\/|\\)/.test(file) || (!includeDirs && stat.isDirectory()))
        return cb(null, false)
      if (stat.isFile()) {
        isBinaryFile(fullPath, function (err, result) {
          if (err || result) return cb(null, false)
          cb(null, stat)
        })
      } else if (includeDirs && stat.isDirectory()) {
        cb(null, stat)
      } else cb(null, false)
    })
  }

  repo.saveSort = function (sort, cb) {
    cb = tools.cb(cb)
    fs.writeFile(repo.getFullPath(SORT_FILE), JSON.stringify(sort), cb)
  }

  repo.readSort = function (cb) {
    fs.readFile(repo.getFullPath(SORT_FILE), (err, data) => {
      if (err) return cb(err)
      repo.sort = JSON.parse(data)
      cb(null, repo.sort)
    })
  }

  repo.saveConfig = function (cb) {
    repo.savingConfig = true
    cb = tools.cb(cb)
    var _cb = function (err, resp) {
      repo.savingConfig = false
      cb(err, resp)
    }
    var dir = repo.getFullPath(CONFIG_DIR)
    var file = repo.getFullPath(CONFIG_FILE_YML)
    fs.exists(dir, function (exists) {
      const data = { ...repo.getConfig() }
      delete data.cardActionsFunction
      delete data.boardActionsFunction
      delete data.cardPropertiesFunction
      delete data.path
      if (data.lists) data.lists.forEach((list) => delete list.tasks)
      var yaml = dumpYAML(data)
      if (exists) {
        fs.writeFile(file, yaml, _cb)
      } else {
        fs.mkdir(dir, function (err) {
          if (err) return _cb(err)
          fs.writeFile(file, yaml, _cb)
        })
      }
    })
  }

  repo.updateConfig = function (loadedConfig, cb) {
    var baseConfig = _cloneDeep(DEFAULT_CONFIG)
    var include_lists = baseConfig.code.include_lists
    const currentConfig = repo.config
    if (currentConfig && currentConfig.code)
      include_lists = _union(include_lists, currentConfig.code.include_lists)

    if (currentConfig && currentConfig.settings)
      loadedConfig.settings = {...currentConfig.settings, ...loadedConfig.settings}

    if (loadedConfig && loadedConfig.code)
      include_lists = _union(include_lists, loadedConfig.code.include_lists)

    const newConfig = new Config(
      _assign({}, baseConfig, repo.config, loadedConfig, { path: repo.path })
    )

    repo.migrateTasksByConfig(currentConfig, newConfig, (err) => {
      if (err) return cb(err)
      repo.config = newConfig
      repo.config.code.include_lists = include_lists
      var _languages = _cloneDeep(languages)
      repo.languages = repo.config.languages
        ? _assign(_languages, repo.config.languages)
        : _languages
      cb(null, repo.config)
    })
  }

  repo.loadConfig = function (cb) {
    // BACKLOG If a config is bad move it to config.json.bak and save a new one with defaults gh:2 id:9 +enhancement +standup +chore
    // <!--
    // order:-670
    // -->
    cb = tools.cb(cb)
    repo.loadIgnore()
    // new
    const configData =  (!repo.config || repo.config.dirty) ? this.getYamlConfig() : repo.config || {}
    repo.updateConfig(configData, cb)
  }

  repo.getConfigFile = function () {
    return repo.getFullPath(CONFIG_FILE)
  }

  repo.getYamlConfig = function () {
    const filePath = repo.getFullPath(CONFIG_FILE_YML)
    if (!fs.existsSync(filePath)) return
    const configData = fs.readFileSync(filePath, 'utf-8')
    let configLike = {}
    try {
      configLike = loadYAML(configData.toString())
    } catch (e) {
      /* noop */
    }
    return configLike
  }

  var _deleteTasks = repo.deleteTasks
  repo.deleteTasks = function (tasks, cb) {
    _deleteTasks.call(repo, tasks, function (err) {
      if (err) return cb(err)
      repo.emit('tasks.updated', tasks)
      cb()
    })
  }

  repo.writeFile = function (file, emitFileUpdate, cb) {
    if (_isFunction(emitFileUpdate)) {
      cb = emitFileUpdate
      emitFileUpdate = false
    }
    cb = tools.cb(cb)

    if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE))
    if (file.deleted) return cb(null, file)
    
    var filePath = repo.getFullPath(file)

    if (!/\.\.(\/|\\)/.test(file.path)) {
      var write = function () {
        var oldChecksum = file.checksum
        file.checksum = checksum(file.getContentForFile())
        fs.writeFile(
          filePath,
          file.getContentForFile(),
          'utf8',
          function (err) {
            if (err) {
              file.checksum = oldChecksum
              return cb([new Error('Unable to write file:' + filePath), err])
            }

            fs.stat(filePath, function (err, stats) {
              if (err)
                return cb([new Error('Unable to stat file:' + filePath), err])

              file.setModifiedTime(stats.mtime)
              file.modified = false
              repo.addFilePath(filePath)
              if (emitFileUpdate) repo.emit('file.saved', file)
              cb(null, file)
            })
          }
        )
      }

      var dirName = _path.dirname(filePath)
      if (fs.existsSync(dirName)) {
        return write()
      }

      tools.mkdirp(fs, dirName, function (err) {
        if (err) return cb(err)
        write()
      })
    } else return cb(new Error('Unable to write file:' + file.path), file)
  }

  repo.getFilesInPath = function (includeDirs, cb) {
    cb = tools.cb(cb)
    ls(repo.path, function (err, allPaths) {
      if (err) return cb(err)
      var files = [],
        processed = 0
      log('allPaths=', allPaths)
      if (allPaths.length === 0) return cb(null, [])
      async.eachLimit(
        allPaths,
        ASYNC_LIMIT,
        function (path, _cb) {
          if (!path) return _cb()
          path = repo.getRelativePath(path)
          repo.fileOK(path, includeDirs, function (err, stat) {
            // stack-3 repo-fs-store.js:250:14
            processed++
            if (err) return _cb(err)
            repo.emit('file.processed', {
              file: path,
              ok: stat !== false,
              total: allPaths.length,
              processed: processed + 1,
              repoId: repo.getId(),
            })

            if (stat) {
              log('%s is ok %j', path, stat)
              var file = new File({
                repoId: repo.getId(),
                filePath: path,
                modifiedTime: stat.mtime,
                createdTime: stat.birthtime,
                languages: repo.languages,
                project: repo.project,
              })
              file.isDir = stat.isDirectory()
              files.push(file)
            }
            log('err=%j', err, null)
            log('stat=%j', stat, null)
            log('processed=%d allPaths.length=%d', processed, allPaths.length)
            _cb() // stack-1 repo-fs-store.js:270:11
          })
        },
        function (err) {
          cb(err, fastSort(files).asc(u => u.path))
        }
      )
    })
  }

  repo.readFileContent = function (file, cb) {
    cb = tools.cb(cb)
    if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE))
    var filePath = repo.getFullPath(file)

    fs.lstat(filePath, function (err, stats) {
      if (err) return cb([new Error('Unable to stat file:' + filePath), err])
      if (!stats.isFile()) return cb(null, file)
      fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) return cb([new Error('Unable to read file:' + filePath), err])

        file
          .setContentFromFile(data)
          .setModifiedTime(stats.mtime)
          .setCreatedTime(stats.birthtime)

        file.lineCount = eol.split(data).length
        cb(null, file)
      })
    })
  }

  repo.deleteFile = function (path, cb) {
    cb = tools.cb(cb)
    var file = File.isFile(path) ? path : repo.getFile(path)
    if (!_isUndefined(file)) {
      fs.unlink(repo.getFullPath(file), function (err) {
        if (err) return cb('Unable to delete:' + path + ' : ' + err.toString())
        repo.removeFile(file)
        cb(null, file)
      })
    } else cb('Unable to delete:' + path)
  }

  return repo
}
