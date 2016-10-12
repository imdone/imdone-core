'use strict';

var fs           = require('fs'),
    _            = require('lodash'),
    fsStore      = require('./repo-fs-store'),
    log          = require('debug')('imdone-mixins:repo-watched-fs-store'),
    File         = require('../file'),
    constants    = require('../constants'),
    chokidar     = require('chokidar');

module.exports = mixin;

// READY: Only emit file.update if the file checksum has changed
function mixin(repo, fs) {
  fs = fs || require('fs');

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
    return relPath.indexOf(constants.CONFIG_FILE) > -1;
  };

  var _isImdoneIgnore = function(path) {
    var relPath = repo.getRelativePath(path);
    return relPath.indexOf(constants.IGNORE_FILE) > -1;
  };

  repo.initWatcher = function() {
    log("Creating a new watcher");
    repo.watcher = chokidar.watch(repo.path, {
      ignored: function(path) {
        return false;
        // if (!repo.path) return true;
        // var relPath = repo.getRelativePath(path);
        // if (relPath.indexOf('.imdone') === 0) return false;
        // var exclude = repo.shouldExclude(relPath);
        // return exclude;
      },
      persistent: true
    });

    repo.watcher
    .on('add', function(path) {
      log("Watcher received add event for file: " + path);
      var relPath = repo.getRelativePath(path);
      var file = repo.getFile(relPath);
      if (file === undefined) file = new File({repoId: repo.getId(), filePath: relPath, languages: repo.languages});

      repo.fileOK(file, function(err, stat) {
        if (err || !stat) return;
        if (stat.mtime <= file.getModifiedTime()) return;
        log("Reading file: " + path);
        repo.readFile(file, function (err, file) {
          repo.emitFileUpdate(file);
        });
      });
    })
    .on('addDir', function(path) {log('Directory', path, 'has been added');})
    .on('change', function(path) {
      log("Watcher received change event for file: " + path);
      var relPath = repo.getRelativePath(path);
      var file = repo.getFile(relPath) || relPath;
      if (_isImdoneConfig(path) || _isImdoneIgnore(path)) {
        repo.emitConfigUpdate();
      } else {
        repo.fileOK(file, function(err, ok) {
          if (err || !ok) return;
          log("Reading file: " + path);
          repo.readFile(file, function (err, file) {
            repo.emitFileUpdate(file);
          });
        });
      }
    })
    .on('unlink', function(path) {
      log("Watcher received unlink event for file: " + path);
      var file = new File({repoId: repo.getId(), filePath: repo.getRelativePath(path), languages: repo.languages});
      log("Removing file: " + path);
      repo.removeFile(file);
      repo.emitFileUpdate(file);
    })
    .on('unlinkDir', function(path) {log('Directory', path, 'has been removed');})
    .on('error', function(error) {console.error('Error while watching files:', error);});

  };

  return repo;
}
