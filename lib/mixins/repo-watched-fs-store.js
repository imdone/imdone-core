'use strict'

var fsStore = require('./repo-fs-store'),
  log = require('debug')('imdone-mixins:repo-watched-fs-store'),
  File = require('../file'),
  constants = require('../constants'),
  sane = require('sane'),
  path = require('path')

module.exports = mixin

// BACKLOG Only emit file.update if the file checksum has changed
// <!--
// order:-650
// -->
function mixin(repo, fs = require('fs')) {
  repo = fsStore(repo, fs)
  var _refresh = repo.refresh
  var _destroy = repo.destroy
  var _init = repo.init
  var initializing = false
  var paused = false

  repo.init = function (cb) {
    if (initializing) {
      const err = new Error("Can't initialize repo while it's initializing.")
      console.error(err.message)
      return cb ? cb(err) : null
    }
    log('Initializing repo:', repo.path)
    initializing = true
    _init.call(repo, function (err, files) {
      if (err) {
        console.error(`Error initializing repo: ${err.message}`)
        initializing = false
        return cb ? cb(err) : null
      }
      // Check if pause file exists on init
      const pauseFilePath = path.join(repo.path, constants.PAUSE_FILE)
      fs.access(pauseFilePath, fs.constants.F_OK, (accessErr) => {
        if (!accessErr) {
          log('Pause file detected on init. Pausing repository.')
          paused = true
        }
        repo.initWatcher(() => {
          initializing = false
          if (cb) cb(err, files)
        })
      })
    })
  }

  repo.destroy = function () {
    if (repo.watcher) repo.watcher.close()
    _destroy.apply(repo)
  }

  repo.refresh = function (cb) {
    if (initializing) {
      return cb ? cb('already initializing') : null
    }
    console.info('Initializing repo:', repo.path)
    initializing = true
    if (repo.watcher) repo.watcher.close()
    _refresh.call(repo, function (err, files) {
      if (err) {
        initializing = false
        return cb ? cb(err) : null
      }
      // Check if pause file exists on refresh
      const pauseFilePath = path.join(repo.path, constants.PAUSE_FILE)
      fs.access(pauseFilePath, fs.constants.F_OK, (accessErr) => {
        if (!accessErr) {
          log('Pause file detected on refresh. Pausing repository.')
          paused = true
        } else {
          paused = false
        }
        repo.initWatcher(() => {
          initializing = false
          return cb ? cb(err, files) : null
        })
      })
    })
  }

  var _isImdoneConfig = function (path) {
    return path === constants.CONFIG_FILE_YML
  }

  var _isImdoneIgnore = function (path) {
    return path === constants.IGNORE_FILE
  }

  var _isImdonePause = function (path) {
    return path === constants.PAUSE_FILE
  }

  const onConfigChange = function (file) {
    console.info('Loading config.  Observed a change to:', file)
    const label = `Refresh repo: ${repo.path}`
    console.time(label)
    repo.refresh((err, files) => {
      if (err) console.error('Error refreshing repo', err)
      console.timeEnd(label)
      repo.emitConfigUpdate(file, repo.config)
    })
  }

  const onIgnoreChange = onConfigChange

  repo.pause = async function () {
    log('Pausing watcher for:', repo.path)
    paused = true
    repo.emit('paused')
    return Promise.resolve()
  }

  repo.resume = async function () {
    log('Resuming watcher for:', repo.path)
    paused = false
    return new Promise((resolve, reject) => {
      repo.refresh((err, files) => {
        if (err) {
          console.error('Error refreshing repo on resume', err)
          return reject(err)
        }
        repo.emit('resumed')
        resolve(files)
      })
    })
  }

  repo.isPaused = function () {
    return paused
  }

  repo.initWatcher = function (cb) {
    console.log('initializing watcher for:', repo.path)
    repo.watcher = sane(repo.path, {
      dot: true,
      ignored(file) {
        if (!initializing && _isImdoneConfig(file)) {
          onConfigChange(file)
        }

        if (!initializing && _isImdoneIgnore(file)) {
          onIgnoreChange(file)
        }

        // Don't ignore the pause file so we can detect it
        if (_isImdonePause(file)) {
          return false
        }

        const ignore = !repo.shouldInclude(file)
        if (!ignore || /^.*\.(jpg|gif|pdf|png)$/i.test(file)) {
          repo.addFilePath(file)
        }
        return ignore
      },
    })

    repo.watcher
      .on('error', (err) => {
        console.error('Error in watcher')
        console.error(err)
        cb(err)
      })
      .on('ready', () => {
        console.log('watcher ready for:', repo.path)
        initializing = false
        cb()
      })
      .on('add', function (path, root, stat) {
        console.log('Watcher received add event for file: ' + path)
        if (_isImdonePause(path)) {
          console.log('Pause file detected. Pausing repository.')
          return repo.pause()
        }
        if (paused) return log('Watcher is paused. Ignoring add event for: ' + path)
        if (stat.isDirectory()) return
        var file = repo.getFile(path)
        if (file === undefined) {
          log('Creating file: ' + path)
          file = new File({
            repoId: repo.getId(),
            filePath: path,
            languages: repo.languages,
            project: repo.project,
          })
        }

        repo.fileOK(file, function (err, stat) {
          log('fileOK returned: ' + JSON.stringify(stat))
          if (err || !stat) return
          if (stat.mtime <= file.getModifiedTime()) {
            return log('File update already applied.  Change ignored for file: ' + path)
          }
          log('Reading file: ' + path)
          repo.readFile(file, function (err, file) {
            repo.emitFileUpdate(file)
          })
        })
      })
      .on('change', function (path, root, stat) {
        console.log(
          `Watcher received change event for file: ${path} repoPath: ${repo.path}`,
          stat.mtime
        )
        if (_isImdonePause(path)) return log('Ignoring change to pause file')
        if (paused) return log('Watcher is paused. Ignoring change event for: ' + path)
        if (!path || stat.isDirectory()) return
        var file = repo.getFile(path) || path
        const isFile = File.isFile(file)
        // BACKLOG ## Handle the case where the file is not in the repo
        // #urgent #1.12.0
        // <!--
        // order:-660
        // -->
        if (isFile && stat.mtime <= file.getModifiedTime()) {
          // console.log("File update already applied.  Change ignored.")
          return
        }
        if (_isImdoneConfig(path)) return onConfigChange(path)
        if (_isImdoneIgnore(path)) return onIgnoreChange(path)

        repo.fileOK((file && file.path) || path, function (err, ok) {
          if (err) {
            console.error('Error processing ignore on path: ', path, err)
            return
          }
          if (!ok) return
          log('Reading file: ' + path)
          if (!isFile) file = repo.getFile(path)
          repo.readFile(file, function (err, file) {
            repo.emitFileUpdate(file)
          })
        })
      })
      .on('delete', function (path) {
        log('Watcher received unlink event for file: ' + path)
        if (_isImdonePause(path)) {
          console.log('Pause file deleted. Resuming repository.')
          return repo.resume()
        }
        if (paused) return log('Watcher is paused. Ignoring delete event for: ' + path)
        repo.removeFilePath(path)
        var file = new File({
          repoId: repo.getId(),
          filePath: path,
          languages: repo.languages,
          project: repo.project,
        })
        log('Removing file: ' + path)
        repo.removeFile(file)
        repo.emitFileUpdate(file, true)
      })
  }

  return repo
}
