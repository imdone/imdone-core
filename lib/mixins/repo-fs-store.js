'use strict';

var fs           = require('fs'),
    _path        = require('path'),
    _            = require('lodash'),
    async        = require('async'),
    checksum     = require('checksum'),
    tools        = require('../tools'),
    constants    = require('../constants'),
    log          = require('debug')('imdone-mixins:repo-fs-store'),
    File         = require('../file'),
    Config       = require('../config'),
    languages    = require('../languages'),
    isBinaryFile = require('isbinaryfile'),
    dir          = require('node-dir');

module.exports = mixin;

var CONFIG_DIR  = constants.CONFIG_DIR,
    CONFIG_FILE = constants.CONFIG_FILE,
    NO_CONTENT  = constants.ERRORS.NO_CONTENT,
    ASYNC_LIMIT = constants.ASYNC_LIMIT;

function getRegExp(s) {
  var re;
  try {
    re = new RegExp(s);
  } catch(e) {}
  return re;
}

function mixin(repo, fs) {
  fs = fs || require('fs');

  repo.init = function(cb) {
    log("Initializing repo:", repo.path);
    cb = tools.cb(cb);
    repo.initializing = true;
    fs.stat(repo.path, function(err, stat) {
      if (err || !stat.isDirectory()) {
        var error = new Error("Path must be an existing directory on the file system");
        repo.emit('error', error);
        repo.initializing = false;
        return cb(error);
      }

      repo.loadConfig(function(err, config) {
        if (err) {
          repo.emit('error', err);
          repo.initializing = false;
          return cb(err);
        }
        repo.config = config;
        repo.emit('config.loaded');
        if (config.isNew) repo.saveConfig();
        repo.initPlugins();
        repo.createListeners();
        repo.readFiles(function(err, files) {
          repo.initializing = false;
          if (err && repo.destroyed) return cb(err);
          repo.initialized = true;
          repo.emit('initialized', {ok:true});
          if (err) repo.emit('error', err);
          cb(err, files);
        });

      });
    });
  };

  repo.loadIgnore = function() {
    repo.globs = [];
    var ignoreFile = _path.join(repo.path, constants.IGNORE_FILE);
    if (!fs.existsSync(ignoreFile)) return;
    repo.setIgnores(fs.readFileSync(ignoreFile).toString());
  };

  repo.fileStats = function(cb) {
    log("Getting file stats for repo:", repo.path);
    cb = tools.cb(cb);
    fs.stat(repo.path, function(err, stat) {
      if (err || !stat.isDirectory()) return cb(new Error("Path must be an existing directory on the file system"));
      repo.loadConfig(function(err, config) {
        if (err) return cb(err);
        repo.config = config;
        dir.files(repo.path, function (err, files) {
          if (err) return cb(err);
          var goodFiles = files.filter(function(file) {
            return !repo.shouldExclude(repo.getRelativePath(file));
          });
          cb(null, goodFiles);
        });
        // DONE: Just count the files and check if shouldExclude +performance id:22
      });
    });
  };

  repo.fileOK = function(file, includeDirs, cb) {
    if (File.isFile(file)) file = file.path;
    if (_.isFunction(includeDirs)) {
      cb = includeDirs;
      includeDirs = false;
    }
    cb = tools.cb(cb);
    if (this.shouldExclude(file)) return cb(null, false); // stack-2 repo-fs-store.js:105:42
    var fullPath = repo.getFullPath(file);
    fs.stat(fullPath, function(err, stat) {
      if (err) return cb(err);
      if ( /\.\.(\/|\\)/.test(file) || (!includeDirs && stat.isDirectory())) return cb(null, false);
      if (stat.isFile()) {
        isBinaryFile(fullPath, function(err, result) {
          if (err || result) return cb(null, false);
          cb(null, stat);
        });
      } else if (includeDirs && stat.isDirectory()) {
        cb(null, stat);
      } else cb(null, false);
    });
  };

  repo.saveConfig = function(cb) {
    repo.savingConfig = true;
    cb = tools.cb(cb);
    var _cb = function(err, resp) {
      repo.savingConfig = false;
      cb(err, resp);
    };
    var dir = repo.getFullPath(CONFIG_DIR);
    var file = repo.getFullPath(CONFIG_FILE);
    fs.exists(dir, function(exists) {
      if (repo.config && repo.config.isNew) delete repo.config.isNew;
      var json = JSON.stringify(repo.getConfig(), null, 2);
      if (exists) {
        fs.writeFile(file, json, _cb);
      } else {
        fs.mkdir(dir, function(err) {
          if (err) return _cb(err);
          fs.writeFile(file, json, _cb);
        });
      }
    });
  };

  function newConfig(baseConfig, loadedConfig) {
    var config = (loadedConfig) ? new Config(_.defaults(loadedConfig, baseConfig)) :
                 new Config(baseConfig);
    var _languages = _.cloneDeep(languages);
    repo.languages = (config.languages) ? _.assign(_languages, config.languages) : _languages;
    return config;
  }

  repo.loadConfig = function(cb) {
    // TODO: If a config is bad move it to config.json.bak and save a new one with defaults +enhancement +standup +chore gh:2 id:10
    cb = tools.cb(cb);
    repo.loadIgnore();
    var baseConfig = _.cloneDeep(constants.DEFAULT_CONFIG);
    if (repo.config) baseConfig = _.defaults(baseConfig, repo.config);
    var file = repo.getFullPath(CONFIG_FILE);
    fs.exists(file, function(exists) {
      if (exists) {
        fs.readFile(file, function(err, data) {
          if (err) return cb(err);
          var configLike = {};
          try {
            configLike = JSON.parse(data.toString());
          } catch (e) {/* noop */}
          cb(null, newConfig(baseConfig, configLike));
        });
      } else {
        cb(null, newConfig(baseConfig, {isNew: true}));
      }
    });
  };

  var _deleteTasks = repo.deleteTasks;
  repo.deleteTasks = function(tasks, cb) {
      _deleteTasks.call(repo, tasks, false, function(err) {
        if (err) return cb(err);
        repo.saveModifiedFiles(function(err, files) {
          repo.emit('tasks.updated', tasks);
        });
      });
  };

  repo.writeFile = function(file, emitFileUpdate, cb) {
    if (_.isFunction(emitFileUpdate)) {
      cb = emitFileUpdate;
      emitFileUpdate = false;
    }
    cb = tools.cb(cb);
    if (!File.isFile(file)) return cb(new Error(constants.ERRORS.NOT_A_FILE));
    var filePath = repo.getFullPath(file);

    if (!/\.\.(\/|\\)/.test(file.path)) {
      // If dir does not exist create it
      var dirName = _path.dirname(filePath);

      var write = function() {
        if (!file.content) return cb(NO_CONTENT);
        var oldChecksum = file.checksum;
        file.checksum = checksum(file.content);
        fs.writeFile(filePath, file.content, 'utf8', function(err) {
          if (err) {
            file.checksum = oldChecksum;
            return cb([new Error("Unable to write file:" + filePath), err]);
          }

          fs.stat(filePath, function(err, stats) {
            if (err) return cb([new Error("Unable to stat file:" + filePath), err]);

            file.setModifiedTime(stats.mtime);
            file.modified = false;
            repo.extractTasks(file, function(err, file) {

              if (err) return cb(new Error("Unable to extract tasks for file:" + filePath));
              repo.addFile(file, function(err) {
                if (err) return cb(new Error("Unable to add file:" + filePath));
                if (emitFileUpdate) repo.emit('file.saved', file);
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
    dir.files(repo.path, function(err, allPaths) {
      if (err) return cb(err);
      allPaths = allPaths.filter(function(file) {
        return !repo.shouldExclude(repo.getRelativePath(file));
      });
      var files = [], processed = 0;
      log('allPaths=', allPaths);
      if (allPaths.length === 0) return cb(null, []);
      async.eachLimit(allPaths, ASYNC_LIMIT, function(path, _cb) {
        if (!path) return _cb();
        path = repo.getRelativePath(path);
        repo.fileOK(path, includeDirs, function(err, stat) { // stack-3 repo-fs-store.js:250:14
          processed++;
          if (err) return _cb(err);
          repo.emit("file.processed", {
            file: path,
            ok: (stat !== false),
            total: allPaths.length,
            processed: processed+1,
            repoId: repo.getId()
          });

          if (stat) {
            log("%s is ok %j", path, stat);
            var file = new File({repoId: repo.getId(), filePath: path, modifiedTime: stat.mtime, languages: repo.languages});
            file.isDir = stat.isDirectory();
            files.push(file);
          }
          log('err=%j', err, null);
          log('stat=%j', stat, null);
          log('processed=%d allPaths.length=%d', processed, allPaths.length);
          _cb(); // stack-1 repo-fs-store.js:270:11
        });

      }, function(err) {
        cb(err, _.sortBy(files, "path"));
      });
    });
  };

  repo.getFileTree = function(path, cb) {
    var out = {};
    var waitCount = 0;

    if (_.isFunction(path)) {
      cb = path;
      path = repo.path;
    }

    cb = tools.cb(cb);

    var getFileTree = function(path, _out, cb) {
      log("Path:", path);

      waitCount++;
      dir.files(path, function(err, files) {
        if (err) return cb(err);
        waitCount--;

        files = files.filter(function(file) {
          return !repo.shouldExclude(repo.getRelativePath(file));
        });
        _.each(files, function(file) {
          var fullPath = _path.join(path, file);
          var relPath = repo.getRelativePath(fullPath);
          waitCount++;
          repo.fileOK(relPath, true, function(err, stats) {
            if (err) return cb(err);
            waitCount--;
            if (!stats) return;
            var this_out = { name: _path.basename(file), path: relPath };
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

    getFileTree(path, out, cb);

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
