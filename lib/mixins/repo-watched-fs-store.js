'use strict';

var fsStore      = require('./repo-fs-store'),
    log          = require('debug')('imdone-mixins:repo-watched-fs-store'),
    File         = require('../file'),
    constants    = require('../constants'),
    sane         = require('sane');

module.exports = mixin;

// TODO:7.5 Only emit file.update if the file checksum has changed
function mixin(repo, fs = require('fs')) {
  repo = fsStore(repo, fs);

  var _init = repo.init;
  repo.init = function(cb) {
    _init.call(repo, function(err, files) {
        repo.initWatcher();
        if (cb) cb(err, files);
    });
  };

  var _destroy = repo.destroy;
  repo.destroy = function() {
    if (repo.watcher) repo.watcher.close();
    _destroy.apply(repo);
  };

  var _refresh = repo.refresh;
  repo.refresh = function(cb) {
    if (repo.watcher) repo.watcher.close();
    _refresh.call(repo, function(err, files) {
      repo.initWatcher();
      if (cb) cb(err, files);
    });
  };

  var _isImdoneConfig = function(path) {
    var relPath = repo.getRelativePath(path);
    return relPath.indexOf(constants.CONFIG_FILE) > -1 || relPath.indexOf(constants.CONFIG_FILE_YML) > -1 
  };

  var _isImdoneIgnore = function(path) {
    var relPath = repo.getRelativePath(path);
    return relPath.indexOf(constants.IGNORE_FILE) > -1;
  };

  repo.initWatcher = function() {
    log("Creating a new watcher for:", repo.path);
    repo.initializingWatcher = true
    repo.watcher = sane(repo.path,{
      ignored (file) {
        if (!repo.initializingWatcher && (_isImdoneConfig(file) || _isImdoneIgnore(file))) {
          repo.loadConfig((err, config) => {
            repo.emitConfigUpdate(config)
          })
        }
        const excluded = repo.shouldExclude(file)
        return excluded
      }
    });

    repo.watcher
    .on('ready', () => {
      delete repo.initializingWatcher
      // console.log(JSON.stringify({watching:repo.watcher.dirRegistery}))
    })
    .on('add', function(path, root, stat) {
      log("Watcher received add event for file: " + path);
      if (stat.isDirectory()) return
      repo.addFilePath({path, stat})
      var file = repo.getFile(path);
      if (file === undefined) file = new File({repoId: repo.getId(), filePath: path, languages: repo.languages});

      repo.fileOK(file, function(err, stat) {
        if (err || !stat) return;
        if (stat.mtime <= file.getModifiedTime()) return;
        log("Reading file: " + path);
        repo.readFile(file, function (err, file) {
          repo.emitFileUpdate(file);
        });
      });
    })
    .on('change', function(path, root, stat) {
      log(`Watcher received change event for file: ${path} repoPath: ${repo.path}`, stat.mtime);
      if (stat.isDirectory()) return
      var file = repo.getFile(path) || path;
      // TODO:0.46875 ## Handle the case where the file is not in the repo +urgent
      // console.log(`file.modifiedTime ${file.getModifiedTime()} stat.mtime ${stat.mtime}`)
      if (stat.mtime <= file.getModifiedTime()) {
        // console.log("File update already applied.  Change ignored.")
        return
      }
      if (!(_isImdoneConfig(path) || _isImdoneIgnore(path))) {
        repo.fileOK(file, function(err, ok) {
          if (err || !ok) return;
          log("Reading file: " + path);
          repo.readFile(file, function (err, file) {
            repo.emitFileUpdate(file);
        });
        });
      }
    })
    .on('delete', function(path) {
      log("Watcher received unlink event for file: " + path);
      repo.removeFilePath(path)
      var file = new File({repoId: repo.getId(), filePath: path, languages: repo.languages});
      log("Removing file: " + path);
      repo.removeFile(file);
      repo.emitFileUpdate(file, true);
    })
  };

  return repo;
}
