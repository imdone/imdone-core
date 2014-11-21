'use strict';

var fs           = require('fs'),
    path         = require('path'),
    _            = require('lodash'),
    tools        = require('../tools'),
    constants    = require('../constants'),
    log          = require('debug')('imdone-mixins:repo-fs-store'),
    chokidar     = require('chokidar'),
    File         = require('../file'),
    Config       = require('../config'),
    isBinaryFile = require('isbinaryfile'),
    recursive    = require('recursive-readdir');

module.exports = mixin;

var CONFIG_DIR  = ".imdone",
    CONFIG_FILE = path.join(CONFIG_DIR,"config.json");

function mixin(repo) {

  repo.init = function(cb) {
    log("Initializing repo:", repo.path);
    cb = tools.cb(cb);
    fs.stat(repo.path, function(err, stat) {
      if (err || !stat.isDirectory()) return cb(new Error("Path must be an existing directory on the file system"));
      repo.loadConfig(function(err, config) {
        if (err) return cb(err);
        _.defaults(config, _.cloneDeep(constants.DEFAULT_CONFIG));
        repo.config = new Config(config);
        repo.initPlugins();
        repo.createListeners();
        repo.readFiles(function(err, files) {
          if (repo.config.watcher) { repo.initWatcher(); }
          repo.emit('initialized', {ok:true});
          cb(err, files);
        });

      });
    });
  };

  var _destroy = repo.destroy;
  repo.destroy = function() {
    if (repo.watcher) repo.watcher.close();
    _destroy.apply(repo);
  };

  repo.initWatcher = function() {
    log("Creating a new watcher");
    repo.watcher = chokidar.watch(repo.path, {
      ignored: function(path) {
        var relPath = repo.getRelativePath(path);
        var exclude = repo.shouldExclude(relPath);
        return exclude;
      }, 
      persistent: true
    });
    
    repo.watcher
    .on('add', function(path) {
      log("Watcher received add event for file: " + path);
      var relPath = repo.getRelativePath(path);
      var file = repo.getFile(relPath);
      if (file === undefined) file = new File(repo.getId(), relPath);
      
      repo.fileOK(file, function(err, stat) {
        if (err || !stat) return;
        if (stat.mtime <= file.getModifiedTime()) return;
        log("Reading file: " + path);
        repo.readFile(file, function (err, file) {
          repo.emit("file.update", file);
        });
      });
    })
    .on('addDir', function(path) {log('Directory', path, 'has been added');})
    .on('change', function(path) {
      log("Watcher received change event for file: " + path);
      var file = repo.getFile(repo.getRelativePath(path));
      repo.fileOK(file, function(err, ok) {
        if (err || !ok) return;
        log("Reading file: " + path);
        repo.readFile(file, function (err, file) {
          repo.emit("file.update", file);
        });
      });
    })
    .on('unlink', function(path) {
      log("Watcher received unlink event for file: " + path);
      var file = new File(repo.getId(), repo.getRelativePath(path));
      log("Removing file: " + path);
      repo.removeFile(file);
    })
    .on('unlinkDir', function(path) {log('Directory', path, 'has been removed');})
    .on('error', function(error) {console.error('Error while watching files:', error);});

  };

  repo.fileOK = function(file, includeDirs, cb) {
    if (File.isFile(file)) file = file.path;
    if (_.isFunction(includeDirs)) {
      cb = includeDirs;
      includeDirs = false;
    }
    cb = tools.cb(cb);
    if (repo.shouldExclude(file)) return cb(null, false);

    fs.stat(repo.getFullPath(file), function(err, stat) {
      if (err) return cb(err);
      if ( /\.\.(\/|\\)/.test(file) || (!includeDirs && stat.isDirectory())) return cb(null, false);
      if (stat.isFile()) {
        isBinaryFile(repo.getFullPath(file), function(err, binary) {
          if (binary) return cb(null, false); 
          cb(err, stat);
        });
      } else if (includeDirs && stat.isDirectory()) {
        cb(null, stat);
      } else cb(null, false);
    });
  };

  repo.saveConfig = function(cb) {
    cb = tools.cb(cb);
    var dir = repo.getFullPath(CONFIG_DIR);
    var file = repo.getFullPath(CONFIG_FILE);
    fs.exists(dir, function(exists) {
      var json = JSON.stringify(repo.getConfig(), null, 2);
      if (exists) {
        fs.writeFile(file, json, cb);
      } else {
        fs.mkdir(dir, function(err) {
          if (err) return cb(err);
          fs.writeFile(file, json, cb);
        });
      }
    });
  };

  repo.loadConfig = function(cb) {
    cb = tools.cb(cb);
    if (repo.config) return cb(null, repo.config);
    var file = repo.getFullPath(CONFIG_FILE);
    fs.exists(file, function(exists) {
      if (exists) {
        fs.readFile(function(err, data) {
          if (err) return cb(err);
          var configLike = JSON.parse(data.toString());
          cb(null, configLike);
        });
      } else cb(null, {});
    });
  };

  repo.writeFile = function(file, cb) {
    cb = tools.cb(cb);
    if (!File.isFile(file)) return cb(new Error(constants.ERRORS.NOT_A_FILE));
    var filePath = repo.getFullPath(file);

    if (!/\.\.(\/|\\)/.test(file.path)) {
      // If dir does not exist create it
      var dirName = path.dirname(filePath);

      var write = function() {
        fs.writeFile(filePath, file.content, 'utf8', function(err) {
          if (err) return cb([new Error("Unable to write file:" + filePath), err]);
          
          fs.stat(filePath, function(err, stats) {
            if (err) return cb([new Error("Unable to stat file:" + filePath), err]);

            file.setModifiedTime(stats.mtime);
            file.modified = false;
            repo.extractTasks(file, function(err, file) {

              if (err) return cb(new Error("Unable to extract tasks for file:" + filePath));
              repo.addFile(file, function(err) {
                if (err) return cb(new Error("Unable to add file:" + filePath));
                repo.emit("file.update", file);
                cb(null, file);
              });
            });
          });
        });
      };
      
      fs.exists(dirName, function(exists) {
        if (exists) return write();

        tools.mkdirp(fs, dirName, function(err) {
          if (err) return cb(err);
          else write();
        });
      });
      //log("file:%s", JSON.stringify(file, null, 5));

    } else return cb(new Error("Unable to write file:" + file.path), file);
  };

  repo.getFilesInPath = function(includeDirs, cb) {
    cb = tools.cb(cb);
    recursive(repo.path, function(err, allPaths) {
      if (err) return cb(err);
      var files = [], processed = 0;
      log('allPaths=', allPaths);
      _.each(allPaths, function(path) {
        if (files.length > 10000) return cb(new Error('Too many files in path'));
        path = repo.getRelativePath(path);
        repo.fileOK(path, includeDirs, function(err, stat) {
          processed++;
          repo.emit("file.processed", {
            file: path, 
            ok: (stat !== false), 
            total: allPaths.length, 
            processed: processed+1, 
            repoId: repo.getId()
          });

          if (stat) {
            log("%s is ok %j", path, stat);
            var file = new File(repo.getId(), path);
            file.isDir = stat.isDirectory();
            files.push(file);
          }
          log('err=%j', err, null);
          log('stat=%j', stat, null);
          log('processed=%d allPaths.length=%d', processed, allPaths.length);
          if (processed == allPaths.length) cb(null, _.sortBy(files, "path"));
        });
      });
    });
  };

  // DOING:0 Make getFileTree async
  repo.getFileTree = function(_path, cb) {
    var out = {};
    var waitCount = 0;

    if (_.isFunction(_path)) {
      cb = _path;
      _path = repo.path;
    }

    cb = tools.cb(cb);
    
    var getFileTree = function(_path, _out, cb) {
      log("Path:", _path);

      waitCount++;
      fs.readdir(_path, function(err, files) {
        if (err) return cb(err);
        waitCount--;

        _.each(files, function(file) {
          var fullPath = path.join(_path, file);
          var relPath = repo.getRelativePath(fullPath);
          waitCount++;
          repo.fileOK(relPath, true, function(err, stats) {
            if (err) return cb(err);
            waitCount--;
            if (!stats) return;
            var this_out = { name: path.basename(file), path: relPath };
            if (stats.isDirectory()) {
              if(!_out.dirs) _out.dirs = [];
              _out.dirs.push(this_out);
              getFileTree(fullPath, this_out, cb);
            } else {
              if(!_out.files) _out.files = [];
              _out.files.push(this_out);
            }
            if (waitCount === 0) cb(null, out);
          });
        });

        if (waitCount === 0) cb(null, out);
      });
    };

    getFileTree(_path, out, cb);

  };

  repo.readFileContent = function(file, cb) {
    cb = tools.cb(cb);
    if (!File.isFile(file)) return cb(new Error(constants.ERRORS.NOT_A_FILE));
    var filePath = repo.getFullPath(file);

    fs.stat(filePath, function(err, stats) {
      if (err) return cb([new Error("Unable to stat file:" + filePath), err]);
      fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) return cb([new Error("Unable to read file:" + filePath), err]);
        file.setContent(data).setModifiedTime(stats.mtime);
        cb(null, file);
      });
    });
  };

  repo.deleteFile = function(path, cb) {
    cb = tools.cb(cb);
    var file = repo.getFile(path);
    if (!_.isUndefined(file)) {
      fs.unlink(repo.getFullPath(file), function (err) {
        if (err) return cb("Unable to delete:" + path + " : " + err.toString());
        repo.removeFile(file);
        cb(null, file);
      });
    } else cb("Unable to delete:" + path);
  };

  return repo;
}