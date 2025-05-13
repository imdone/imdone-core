import { fileSystemStoreMixin } from './repo-fs-store.js'
import debug from 'debug'
const log = debug('imdone-mixins:repo-watched-fs-store')
import { File } from '../file.js'
import { constants } from '../constants.js'
import chokidar from 'chokidar'
import realFs from 'fs'
import { logger } from '../adapters/logger.js'

// BACKLOG Only emit file.update if the file checksum has changed
// <!--
// order:-650
// -->
export function watchedFileSystemStoreMixin(repo, fs = realFs) {
  repo = fileSystemStoreMixin(repo, fs)
  const _refresh = repo.refresh
  const _destroy = repo.destroy
  const _init = repo.init
  let initializing = false
  let refreshing = false
  let watcherPaused = false

  function ready() {
    return !initializing && !refreshing
  }

  async function waitForReady() {
    while (!ready()) {
      logger.log('Waiting for repo to be ready:', repo.path)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Add function to pause the watcher
  repo.pauseWatcher = async function() {
    if (repo.watcher && !watcherPaused) {
      logger.info('Pausing file watcher for:', repo.path)
      await repo.watcher.close()
      watcherPaused = true
      repo.emit('watcher.paused')
      return true
    }
    return false
  }

  // Add function to unpause the watcher
  repo.unpauseWatcher = async function() {
    if (watcherPaused) {
      logger.info('Unpausing file watcher for:', repo.path)
      await repo.initWatcher()
      watcherPaused = false
      repo.emit('watcher.resumed')
      return true
    }
    return false
  }

  // READY Refactor init to async/await
  // #esm-migration #important
  // <!--
  // order:-310
  // -->
  repo.init = async function () {
    if (initializing) {
      throw new Error("Can't initialize repo while it's initializing.")
    }
    log('Initializing repo:', repo.path)
    initializing = true
    try {
      const files = await _init.call(repo)
      await repo.initWatcher()
      repo.emit('watching', { ok: true, lists: repo.getLists() })
      initializing = false
      return files
    } catch (err) {
      initializing = false
      throw new Error(`Error initializing repo: ${repo.path}`, { cause: err })
    }
  }

  repo.destroy = async function () {
    if (repo.watcher) await repo.watcher.close()
    await _destroy.apply(repo)
  }

  // READY Refactor refresh to async/await
  // #esm-migration #important
  // <!--
  // order:-330
  // -->
  repo.refresh = async function () {
    await waitForReady()
    log('Refreshing repo:', repo.path)
    refreshing = true
    try {
      const files = await _refresh.call(repo)
      // Only initialize watcher if it's not paused
      if (!watcherPaused) {
        await repo.initWatcher()
      }
      refreshing = false
      return files
    } catch (err) {
      refreshing = false
      throw new Error(`Error refreshing repo: ${repo.path}`, { cause: err })
    }

  }

  function _isImdoneConfig(path) {
    return path === constants.CONFIG_FILE_YML
  }

  function _isImdoneIgnore(path) {
    return path === constants.IGNORE_FILE
  }

  async function onConfigChange(file) {
    logger.info('Loading config.  Observed a change to:', file)
    const label = `Refresh repo: ${repo.path}`
    logger.time(label)
    try {
      await repo.refresh()
      repo.emitConfigUpdate(file, repo.config)
    } finally {
      logger.timeEnd(label)
    }
  }

  const onIgnoreChange = onConfigChange

  // READY Refactor initWatcher to async/await
  // #esm-migration #important
  // <!--
  // order:-320
  // defer:2025-03-18
  // -->
  repo.initWatcher = async () => {
    // Close existing watcher if it exists
    if (repo.watcher) {
      await repo.watcher.close()
    }

    return new Promise(async (resolve, reject) => {
      logger.log('initializing watcher for:', repo.path)
      repo.watcher = chokidar.watch(repo.path, {
        persistent: true,
        usePolling: false,
        alwaysStat: true,
        awaitWriteFinish: true,
        atomic: true,
        ignoreInitial: true,
        ignored: (file) => {
          const ignored = !repo.shouldInclude(file)
          if (ignored) logger.log('Ignoring file:', file)
          return ignored
        }
      }).on('error', (err) => {
          logger.error('Error in watcher')
          logger.error(err)
          repo.emit('watch.error', err)
          reject(err)
        })
        .on('ready', () => {
          logger.log('watcher ready for:', repo.path)
          initializing = false
          resolve()
        })
        .on('add', async function (path, stat) {
          logger.log('Watcher received add event for file: ' + path)
          if (stat.isDirectory()) return
          let file = repo.getFile(path)
          if (file === undefined) {
            log('Creating file: ' + path)
            file = new File({
              repoId: repo.getId(),
              filePath: path,
              languages: repo.languages,
              project: repo.project,
            })
          }

          stat = await repo.fileOK()
          log('fileOK returned: ' + JSON.stringify(stat))
          if (stat.mtime <= file.getModifiedTime()) {
            return log('File update already applied.  Change ignored for file: ' + path)
          }
          log('Reading file: ' + path)
          file = await repo.readFile(file)
          repo.emi('watch.add', file)
          repo.emitFileUpdate(file)
        })
        .on('change', async function (path, stat) {
          logger.log(
            `Watcher received change event for file: ${path} repoPath: ${repo.path}`,
            stat.mtime
          )
          if (!path || stat.isDirectory()) return
          var file = repo.getFile(path) || path
          const isFile = File.isFile(file)
          // BACKLOG ## Handle the case where the file is not in the repo
          // #urgent #1.12.0
          // <!--
          // order:-660
          // -->
          if (isFile && stat.mtime <= file.getModifiedTime()) {
            // logger.log("File update already applied.  Change ignored.")
            return
          }
          if (_isImdoneConfig(path)) return onConfigChange(path)
          if (_isImdoneIgnore(path)) return onIgnoreChange(path)

          const ok = await repo.fileOK((file && file.path) || path)
          if (!ok) return
          log('Reading file: ' + path)
          if (!isFile) file = repo.getFile(path)
          file = await repo.readFile(file)
          repo.emit('watch.change', file)
          repo.emitFileUpdate(file)
        })
        .on('delete', async function (path) {
          log('Watcher received unlink event for file: ' + path)
          repo.removeFilePath(path)
          var file = new File({
            repoId: repo.getId(),
            filePath: path,
            languages: repo.languages,
            project: repo.project,
          })
          log('Removing file: ' + path)
          repo.removeFile(file)
          repo.emit('watch.delete', file)
          repo.emitFileUpdate(file, true)
        })
    });
  }

  return repo
}
