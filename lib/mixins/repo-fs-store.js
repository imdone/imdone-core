'use strict';

var fs               = require('fs'),
    path             = require('path'),
    _                = require('lodash'),
    tools            = require('../tools'),
    constants        = require('../constants'),
    log              = require('debug')('imdone-mixins:repo-fs-store'),
    chokidar         = require('chokidar'),
    File             = require('../file'),
    Config           = require('../config'),
    isBinaryFileSync = require('isbinaryfile');

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
      if (file === undefined) {
        file = new File(repo.getId(), relPath);
      } else if (repo.fs().statSync(path).mtime <= file.getModifiedTime()) return;
      
      if (repo.fileOK(file)) {
        log("Reading file: " + path);
        repo.readFile(file, function (err, file) {
          repo.emit("file.update", file);
        });
      }
    })
    .on('addDir', function(path) {log('Directory', path, 'has been added');})
    .on('change', function(path) {
      log("Watcher received change event for file: " + path);
      var file = repo.getFile(repo.getRelativePath(path));
      if (repo.fileOK(file)) {
        log("Reading file: " + path);
        repo.readFile(file, function (err, file) {
          repo.emit("file.update", file);
        });
      }
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

  repo.fileOK = function(file, includeDirs) {
    if (File.isFile(file)) file = file.path;
    if (repo.shouldExclude(file)) return false;
    var stat = false;
    try {
      stat = fs.lstatSync(repo.getFullPath(file));
      if ( /\.\.(\/|\\)/.test(file) ||
          (!includeDirs && !stat.isFile()) ||
          (stat.isFile() && isBinaryFileSync(repo.getFullPath(file))) ) stat = false;
    } catch (e) {
      stat = false;
    }

    return stat;
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
        fs.writeFile(filePath, file.content, 'utf8', function(err, data) {
          if (err) return cb(new Error("Unable to write file:" + file.path));
          fs.stat(filePath, function(err, stats) {
            if (err) return cb(new Error("Unable to stat file:" + file.path));

            file.setModifiedTime(stats.mtime);
            file.modified = false;
            repo.extractTasks(file);
            repo.addFile(file);
            repo.emit("file.update", file);

            cb(null, file);
          });
        });
      };
      
      fs.exists(dirName, function(exists) {
        if (exists) return write();
        tools.mkdirp(fs, dirName, function(err) {
          if (err) return cb(err);
          write();
        });
      });
      //log("file:%s", JSON.stringify(file, null, 5));

    } else return cb(new Error("Unable to write file:" + file.path), file);
  };

  repo.getFilesInPath = function(includeDirs, cb) {
    cb = tools.cb(cb);
    try {
      var allPaths = tools.readdirSyncRecursive(fs, repo.path);
      var files = [];
      _.each(allPaths, function(path, processed) {
        if (files.length > 10000) throw new Error('Too many files in path');
        var stat = repo.fileOK(path, includeDirs); // #DOING:0 Make fileOK async
        repo.emit("file.processed", {
          file: path, 
          ok: (stat !== false), 
          total: allPaths.length, 
          processed: processed+1, 
          repoId: repo.getId()
        });

        if (stat) {
          var file = new File(repo.getId(), path);
          file.isDir = stat.isDirectory();
          files.push(file);
        }
      });
      cb(null, _.sortBy(files, "path"));
    } catch (e) {
      cb(e);
    }
  };

  repo.getFileTree = function(_path) {
    var out = {};

    if (!_path) _path = repo.path;
    
    log("Path:", _path);
    var files =  fs.readdirSync(_path);
    log("raw files:", files);
    files = _.filter(_.map(files, function(file) { return path.join(_path, file); } ),
              function(file) {
                return repo.fileOK(repo.getRelativePath(file), true);
              }
            ).sort();

    log("ok files:", files);

    _.each(files, function(file) {
      log(file);
      var name = path.basename(file);
      var relPath = repo.getRelativePath(file);
      if (fs.statSync(file).isDirectory()) {
        if(!out.dirs) out.dirs = [];
        out.dirs.push(_.extend({name:name,path:relPath},repo.getFileTree(file)));
      } else {
        if(!out.files) out.files = [];
        out.files.push({name:name,path:relPath});
      }
    });
    return out;
  };

  repo.readFileContent = function(file, cb) {
    cb = tools.cb(cb);
    if (!File.isFile(file)) return cb(new Error(constants.ERRORS.NOT_A_FILE));
    var filePath = repo.getFullPath(file);

    fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to read file:" + file.path));
      file.setContent(data).setModifiedTime(fs.statSync(filePath).mtime);
      cb(null, file);
    });
  };

  repo.readFileContentSync = function(file) {
    var filePath = repo.getFullPath(file);

    file.setContent(fs.readFileSync(filePath, 'utf8'))
        .setModifiedTime(fs.statSync(filePath).mtime);

    return file;
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