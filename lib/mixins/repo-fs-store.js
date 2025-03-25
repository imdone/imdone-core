import _path from 'path'
import _cloneDeep from 'lodash.clonedeep'
import _isFunction from 'lodash.isfunction'
import _isUndefined from 'lodash.isundefined'
import _assign from 'lodash.assign'
import _remove from 'lodash.remove'
import _union from 'lodash.union'
import { eachLimit } from 'async'
import { computeChecksum } from '../checksum.js'
import { constants } from '../constants.js'
import debug from 'debug'
const log = debug('imdone-mixins:repo-fs-store.js')
import { File } from '../file.js'
import { Config } from '../config.js'
import { languages } from '../languages.js'
import { isBinaryFile } from 'isbinaryfile'
import eol from 'eol'
const _eol = String(eol.auto)
import readdirp from 'readdirp'
import _ignore from 'ignore'
import { sort } from 'fast-sort'
import { buildMigrateConfig } from '../migrate-config.js'
import { loadYAML, dumpYAML } from '../adapters/yaml.js';
import realFs, { readFileSync } from 'fs'
import { preparePathForWriting, readFile, writeFile, stat, lstat, unlink } from '../adapters/file-gateway.js'

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

  repo.getAllFilePaths = async function (root) {
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

  repo.migrateConfig = buildMigrateConfig(repo)
  // READY Refactor init to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-270
  // -->
  repo.init = async function () {
    const stats = await stat(repo.path)
    if (!stats.isDirectory()) {
      var error = new Error(
        `Path must be an existing directory on the file system: ${repo.path}`
      )
      repo.emit('error', error)
      throw error
    }

    await repo.loadConfig()
    repo.migrateConfig()
    await repo.saveConfig()
    repo.emit('config.loaded')
    repo.createListeners()
    
    const files = await repo.readFiles()
    const lists = repo.getTasksByList()
    repo.emit('fs-store-initialized', { ok: true, lists })
    return files
  }

  repo.loadIgnore = function () {
    const patterns = getIgnorePatterns() + _eol + DEFAULT_IGNORE_EXTS
    repo.setIgnores(patterns)
  }

  repo.fileOK = async function (file, includeDirs = false) {
    if (File.isFile(file)) file = file.path
    if (!file || !this.shouldInclude(file)) return false

    var fullPath = repo.getFullPath(file)
    try {
      const stats = await lstat(fullPath)
      
      if (!stats) return false
      
      if (/\.\.(\/|\\)/.test(file) || (!includeDirs && stats.isDirectory()))
        return false
          
      const content = await readFile(fullPath)
      
      if (await isBinaryFile(content, stats.size) ) {
        return false
      }
      
      return stats
    } catch (err) {
      return false
    }
  }

  // READY Refactor saveSort to use async/await
  // #esm-migration #important
  // TODO readSort and saveSort are no longer used
  repo.saveSort = async function (sort) {
    writeFile(repo.getFullPath(SORT_FILE), JSON.stringify(sort), 'utf8')
  }

  repo.readSort = async function () {
    const data = readFile(repo.getFullPath(SORT_FILE))
    repo.sort = JSON.parse(data)
  }

  repo.saveConfig = async function () {
    try {
      repo.savingConfig = true
      const file = repo.getFullPath(CONFIG_FILE_YML)
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

  // READY Refactor loadConfig to use async/await
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
    ? await this.getYamlConfig() 
    : repo.config || {}
    
    return await repo.updateConfig(configData)
  }

  repo.getConfigFile = function () {
    return repo.getFullPath(CONFIG_FILE)
  }

  repo.getYamlConfig = async function () {
    const filePath = repo.getFullPath(CONFIG_FILE_YML)
    if (!fs.existsSync(filePath)) return
    const configData = await readFile(filePath, 'utf-8')
    let configLike = {}
    try {
      configLike = loadYAML(configData.toString())
    } catch (e) {
      /* noop */
    }
    return configLike
  }

  // READY Refactor writeFile to use async/await
  // #esm-migration #important
  // <!--
  // order:-280
  // -->
  repo.writeFile = async (file, emitFileUpdate) => {
    if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE)
    if (file.deleted) return file
    
    if (/\.\.(\/|\\)/.test(file.path)) throw new Error('Unable to write file:' + file.path)

    const filePath = repo.getFullPath(file)
    
    await preparePathForWriting(filePath)

    const oldChecksum = file.checksum
    file.checksum = computeChecksum(file.getContentForFile())
        
    try {
      await writeFile(filePath, file.getContentForFile(), 'utf8')
    } catch (err) {
      file.checksum = oldChecksum
      throw new Error('Unable to write file:' + filePath, {cause: err})
    }

    try {
      const stats = await stat(filePath)
      file.setModifiedTime(stats.mtime)
      file.modified = false
      repo.addFilePath(filePath)
      if (emitFileUpdate) repo.emit('file.saved', file)
    } catch (err) {
      throw new Error('Unable to stat file:' + filePath, {cause: err})
    }
  
    return file      
  }

  // READY Refactor getFilesInPath to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-20
  // -->
  repo.getFilesInPath = async function (includeDirs) {
    const allPaths = await repo.getAllFilePaths(repo.path)
    const files = []
    let processed = 0
    log('allPaths=', allPaths)
    if (allPaths.length === 0) return files
    await eachLimit(
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
        log('stat=%j', stat, null)
        log('processed=%d allPaths.length=%d', processed, allPaths.length)
      })
      return sort(files).asc(u => u.path)
  }

  // READY Refactor readFileContent to use async/await
  // #esm-migration #important #urgent
  // <!--
  // order:-40
  // -->
  repo.readFileContent = async function (file) {
    if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE)
    var filePath = repo.getFullPath(file)

    const stats = await stat(filePath)
    if (!stats.isFile()) return file
    const data = await readFile(filePath, 'utf8')

    file
      .setContentFromFile(data)
      .setModifiedTime(stats.mtime)
      .setCreatedTime(stats.birthtime)

    file.lineCount = eol.split(data).length
    return file
  }

  // READY Refactor deleteFile to use async/await
  // #esm-migration #important
  repo.deleteFile = async function (path) {
    const file = File.isFile(path) ? path : repo.getFile(path)
    if (!file) throw new Error('Unable to delete:' + path)

    try {
      await unlink(repo.getFullPath(file))
      repo.removeFile(file)
    } catch (err) {
      throw new Error('Unable to delete file:' + path, {cause: err})
    }

  }

  return repo
}
