'use strict';

var _                = require('lodash'),
    fs               = require('fs'),
    events           = require('events'),
    util             = require('util'),
    File             = require('./file'),
    tools            = require('./tools'),
    Repository       = require('./repository'),
    log              = require('debug')('imdone-core:Watched-Repository');

// Emits task.found, list.found, file.update and file.delete, file.processed
/**
 * A Repository is a file system directory in which to look for tasks in files.  The Repository manages all the files
 * and lists in it's path.
 *
 * @constructor
 * @param {} path
 * @param {} config
 * @return 
 */
function WatchedRepository(path, config) {
  Repository.call(this, path, config);
}

util.inherits(WatchedRepository, events.EventEmitter);
util.inherits(WatchedRepository, Repository);

/**
 * Description
 * @method init
 * @param {} cb
 * @return 
 */
WatchedRepository.prototype.init = function(cb) {
  var self = this;
  cb = tools.cb(cb);

  WatchedRepository.super_.prototype.init.call(this, function(err, files) {
    if (self.config.watcher) { self.initWatcher(); }
    self.emit('initialized', {ok:true});
    log('initialized');
    cb(err,files);
  });  
};

/**
 * Description
 * @method destroy
 * @return 
 */
WatchedRepository.prototype.destroy = function() {
  if (this.watcher) this.watcher.close();
  WatchedRepository.super_.prototype.destroy.apply(this);
};

/**
 * Description
 * @method initWatcher
 * @return 
 */
WatchedRepository.prototype.initWatcher = function() {
  var self = this;
  log("Creating a new watcher");
  this.watcher = require('chokidar').watch(self.path, {
    /**
     * Description
     * @method ignored
     * @param {} path
     * @return exclude
     */
    ignored: function(path) {
      var relPath = self.getRelativePath(path);
      var exclude = self.shouldExclude(relPath);
      return exclude;
    }, 
    persistent: true
  });
  
  this.watcher
  .on('add', function(path) {
    log("Watcher received add event for file: " + path);
    var relPath = self.getRelativePath(path);
    var file = self.getFile(relPath);
    if (file === undefined) {
      file = new File(self.getId(), relPath);
    } else if (fs.statSync(path).mtime <= file.getModifiedTime()) return;
    
    if (self.fileOK(file)) {
      log("Reading file: " + path);
      self.readFile(file, function (err, file) {
        self.emit("file.update", file);
      });
    }
  })
  .on('addDir', function(path) {log('Directory', path, 'has been added');})
  .on('change', function(path) {
    log("Watcher received change event for file: " + path);
    var file = self.getFile(self.getRelativePath(path));
    if (self.fileOK(file)) {
      log("Reading file: " + path);
      self.readFile(file, function (err, file) {
        self.emit("file.update", file);
      });
    }
  })
  .on('unlink', function(path) {
    log("Watcher received unlink event for file: " + path);
    var file = new File(self.getId(), self.getRelativePath(path));
    log("Removing file: " + path);
    self.removeFile(file);
  })
  .on('unlinkDir', function(path) {log('Directory', path, 'has been removed');})
  .on('error', function(error) {console.error('Error while watching files:', error);});

};

module.exports = WatchedRepository;
