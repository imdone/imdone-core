import _path from 'path'
import _cloneDeep from 'lodash.clonedeep'
import _isFunction from 'lodash.isfunction'
import _isUndefined from 'lodash.isundefined'
import _assign from 'lodash.assign'
import _remove from 'lodash.remove'
import _union from 'lodash.union'
import { eachLimit } from 'async-es'
import checksum from 'checksum'
import tools from '../tools'
import constants from '../constants'
import debug from 'debug'
const log = debug('imdone-mixins:repo-fs-store')
import File from '../file'
import { Config } from '../config'
import languages from '../languages'
import isBinaryFile from 'isbinaryfile'
import eol from 'eol'
const _eol = String(eol.auto)
import readdirp from 'readdirp'
import _ignore from 'ignore'
import fastSort from 'fast-sort/dist/sort.js'
import buildMigrateConfig from '../migrate-config'
import { loadYAML, dumpYAML } from '../adapters/yaml';
import realFs from 'fs'
import { preparePathForWriting, readFile, writeFile, stat } from '../adapters/file-gateway'
import reject from 'lodash.reject'

const {
  CONFIG_FILE,
  CONFIG_FILE_YML,
  DEFAULT_CONFIG,
  ASYNC_LIMIT,
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_EXTS,
  IGNORE_FILE,
  SORT_FILE,
  ERRORS,
} = constants

export default function mixin(repo, fs = realFs) {
  repo.checksum = checksum
  repo.allFiles = []

  function getIgnorePatterns() {
    var ignoreFile = _path.join(repo.path, IGNORE_FILE)
    let patterns = DEFAULT_IGNORE_DIRS
    if (fs.existsSync(ignoreFile))
      patterns = patterns + _eol + fs.readFileSync(ignoreFile).toString()

    return patterns
  }

  const IG = _ignore().add(getIgnorePatterns())

  function shouldIncludeFile(entry) {
    const { path, dirent } = entry
    return !dirent.isSymbolicLink() && !IG.ignores(path)
  }

  async function getAllFilePaths(root, cb) {
    const entries = []
    for await (const entry of readdirp(root, { lstat: true, fileFilter: shouldIncludeFile })) {
      entries.push(entry)
    }
    return entries.filter((res) => repo.shouldInclude(res.path))
      .map((res) => res.fullPath)
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
  // TODO Refactor init to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-270
  // -->
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

        repo.loadConfig(async (err) => {
          if (err) {
            repo.emit('error', err)
            return cb(err)
          }
          repo.migrateConfig()
          await repo.saveConfig()
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

  repo.saveConfig = async function () {
    try {
      repo.savingConfig = true
      var file = repo.getFullPath(CONFIG_FILE_YML)
      const data = { ...repo.getConfig() }
      delete data.cardActionsFunction
      delete data.boardActionsFunction
      delete data.cardPropertiesFunction
      delete data.path
      if (data.lists) data.lists.forEach((list) => delete list.tasks)
      const yaml = dumpYAML(data)
      await preparePathForWriting(file)
      await writeFile(file, yaml)
    } finally {
      repo.savingConfig = false
    }
  }

  repo.updateConfig = async function (loadedConfig) {
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

    await repo.migrateTasksByConfig(currentConfig, newConfig)
    repo.config = newConfig
    repo.config.code.include_lists = include_lists
    var _languages = _cloneDeep(languages)
    repo.languages = repo.config.languages
      ? _assign(_languages, repo.config.languages)
      : _languages
    return repo.config
  }

  // TODO Refactor loadConfig to use async/await
  // #esm-migration
  // <!--
  // order:-255
  // -->
  repo.loadConfig = async function (cb) {
    // BACKLOG If a config is bad move it to config.json.bak and save a new one with defaults gh:2 id:9 +enhancement +standup +chore
    // <!--
    // order:-670
    // -->
    repo.loadIgnore()
    const configData =  (!repo.config || repo.config.dirty) 
    ? this.getYamlConfig() 
    : repo.config || {}
    
    return await repo.updateConfig(configData)
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

  // READY Refactor getFilesInPath to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-20
  // -->
  repo.getFilesInPath = async function (includeDirs) {
    const allPaths = getAllFilePaths(repo.path)
    const files = []
    let processed = 0
    log('allPaths=', allPaths)
    if (allPaths.length === 0) return files
    return new Promise((resolve, reject) => {
      eachLimit(
        allPaths,
        ASYNC_LIMIT,
        async (path) => {
          if (!path) return
          path = repo.getRelativePath(path)
          const stat = await repo.fileOK(path, includeDirs)
          processed++
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
        },
        function (err) {
          if (err) return reject(err)
          resolve(fastSort(files).asc(u => u.path))
        }
      )
    })
  }

  // DOING Refactor readFileContent to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-80
  // -->
  repo.readFileContent = async function (file) {
    if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE)
    var filePath = repo.getFullPath(file)

    const stats = await stat(filePath)
    if (!stats.isFile()) return cb(null, file)
    await readFile(filePath, 'utf8')

    file
      .setContentFromFile(data)
      .setModifiedTime(stats.mtime)
      .setCreatedTime(stats.birthtime)

    file.lineCount = eol.split(data).length
    return file
  }

  // TODO Refactor deleteFile to use async/await
  // #esm-migration #important
  repo.deleteFile = async function (path, cb) {
    const promise = new Promise((resolve, reject) => {
      const file = File.isFile(path) ? path : repo.getFile(path)
      if (!_isUndefined(file)) {
        fs.unlink(repo.getFullPath(file), function (err) {
          if (err) {
            err = new Error('Unable to delete:' + path , {cause: err})
            if (cb) cb(err)
            else reject(err)
            return
          }
          repo.removeFile(file)
          if (cb) cb(null, file)
          else resolve(file)
        })
      } else {
        const err = new Error('Unable to delete:' + path)
        if (cb) cb(err)
        else reject(err)
      }
    });

    if (!cb) return promise
  }

  return repo
}
