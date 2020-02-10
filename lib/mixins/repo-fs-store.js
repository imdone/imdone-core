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
    eol          = require('eol'),
    lf           = String(eol.lf),
    readdirp     = require('readdirp'),
    YAML         = require('js-yaml');

module.exports = mixin;

const { CONFIG_DIR, 
        CONFIG_FILE, 
        CONFIG_FILE_YML, 
        TEMPLATES_DIR, 
        ASYNC_LIMIT 
      } = constants
var NO_CONTENT = constants.ERRORS.NO_CONTENT

function getRegExp(s) {
  var re;
  try {
    re = new RegExp(s);
  } catch(e) {}
  return re;
}

function mixin(repo, fs) {
  fs = fs || require('fs');
  repo.checksum = checksum

  function ignore({path, stat}) {
    return !repo.shouldExclude(path) && !stat.isSymbolicLink();
  }

  function ls (root, cb) {
    readdirp({root, fileFilter: ignore, lstat: true }, function (errors, res) {
      if (errors) {
        console.error('Errors reading dir: ', root)
        errors.forEach(function (err) {
          console.error('Error: ', err);
        });
      }
      cb(null, res.files.map(entry => repo.getFullPath(entry.path)))
    })
  }

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
        if (repo.migrateConfig) repo.migrateConfig()
        repo.emit('config.loaded');
        repo.saveConfig();
        repo.initPlugins();
        repo.createListeners();
        repo.readFiles(function(err, files) {
          repo.initializing = false;
          if (err && repo.destroyed) return cb(err);
          repo.addInitialSort((err) => {
            repo.initialized = true;
            repo.emit('initialized', {ok:true, lists:repo.getTasksByList()});
            if (err) repo.emit('error', err);
            cb(err, files);
          })
        });

      });
    });
  };

  repo.addInitialSort = function (cb) {
    const lists = repo.getTasksByList()
    async.each(lists, (list, cb) => {
      const tasks = list.tasks
      let n = 0
      tasks.forEach(task => {
        if (!task.order) task.order = n*10
        n++
      })
      async.eachSeries(tasks, (task, cb) => {
        repo.modifyTask(task, false, cb)
      }, cb)
    }, err => {
      if (err) return cb(err)
      repo.saveModifiedFiles(cb)
    })
  }

  repo.loadIgnore = function() {
    var ignoreFile = _path.join(repo.path, constants.IGNORE_FILE);
    var gitIgnoreFile = _path.join(repo.path, '.gitignore');
    let patterns = constants.DEFAULT_IGNORE
    if (fs.existsSync(ignoreFile)) patterns = patterns + lf + fs.readFileSync(ignoreFile).toString()
    if (fs.existsSync(gitIgnoreFile)) patterns = fs.readFileSync(gitIgnoreFile).toString() + lf + patterns
    
    repo.setIgnores(patterns);
  };

  repo.fileStats = function(cb) {
    log("Getting file stats for repo:", repo.path);
    cb = tools.cb(cb);
    fs.stat(repo.path, function(err, stat) {
      if (err || !stat.isDirectory()) return cb(new Error("Path must be an existing directory on the file system"));
      repo.loadConfig(function(err, config) {
        if (err) return cb(err);
        repo.config = config;
        ls(repo.path, function (err, files) {
          if (err) return cb(err);
          cb(null, files);
        });
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
    fs.lstat(fullPath, function(err, stat) {
      if (err) {
        console.log(err);
        return cb(null, false);
      }
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

  repo.saveSort = function(sort, cb) {
    cb = tools.cb(cb);
    fs.writeFile(repo.getFullPath(constants.SORT_FILE), JSON.stringify(sort), cb)
  };

  repo.readSort = function(cb) {
    fs.readFile(repo.getFullPath(constants.SORT_FILE), (err, data) => {
      if (err) return cb(err)
      repo.sort = JSON.parse(data)
      cb(null, repo.sort)
    })
  }

  repo.saveConfig = function(cb) {
    repo.savingConfig = true;
    cb = tools.cb(cb);
    var _cb = function(err, resp) {
      repo.savingConfig = false;
      cb(err, resp);
    };
    var dir = repo.getFullPath(CONFIG_DIR);
    var file = repo.getFullPath(CONFIG_FILE_YML);
    fs.exists(dir, function(exists) {
      const data = { ...repo.getConfig()}
      if (data.lists) data.lists.forEach(list => delete list.tasks)
      var yaml = YAML.dump(data)
      if (exists) {
        fs.writeFile(file, yaml, _cb);
      } else {
        fs.mkdir(dir, function(err) {
          if (err) return _cb(err);
          fs.writeFile(file, yaml, _cb);
        });
      }
    });
  };

  function newConfig(loadedConfig) {
    var baseConfig = _.cloneDeep(constants.DEFAULT_CONFIG);
    var include_lists = baseConfig.code.include_lists;
    if (repo.config && repo.config.code) include_lists = _.union(include_lists, repo.config.code.include_lists);
    if (loadedConfig && loadedConfig.code) include_lists = _.union(include_lists, loadedConfig.code.include_lists);
    if (loadedConfig && loadedConfig.sync) loadedConfig.sync = {...loadedConfig.sync, useImdoneioForPriority: false}
    repo.config = new Config(_.assign({}, baseConfig, repo.config, loadedConfig));
    repo.config.code.include_lists = include_lists;
    var _languages = _.cloneDeep(languages);
    repo.languages = (repo.config.languages) ? _.assign(_languages, repo.config.languages) : _languages;
    return repo.config;
  }

  repo.loadConfig = function(cb) {
    // TODO:180 If a config is bad move it to config.json.bak and save a new one with defaults gh:2 id:9 +enhancement +standup +chore
    cb = tools.cb(cb);
    repo.loadIgnore();
    // new
    let configData = this.getYamlConfig() || this.getJsonConfig()
    if (configData) return cb(null, newConfig(configData));
    cb(null, newConfig({}), true);
  };

  repo.getConfigFile = function () {
    return repo.getFullPath(CONFIG_FILE);
  };

  repo.getJsonConfig = function () {
    const filePath = repo.getFullPath(CONFIG_FILE)
    if (!fs.existsSync(filePath)) return
    const configData = fs.readFileSync(filePath)
    let configLike = {};
    try {
      configLike = JSON.parse(configData.toString());
      if (configLike.exclude) delete configLike.exclude
      if (configLike.watcher) delete configLike.watcher
    } catch (e) {/* noop */}
    return configLike
  }

  repo.getYamlConfig = function () {
    const filePath = repo.getFullPath(CONFIG_FILE_YML)
    if (!fs.existsSync(filePath)) return 
    const configData = fs.readFileSync(filePath)
    let configLike = {};
    try {
      configLike = YAML.load(configData.toString());
      if (configLike.exclude) delete configLike.exclude
      if (configLike.watcher) delete configLike.watcher
    } catch (e) {/* noop */}
    return configLike
  }

  var _deleteTasks = repo.deleteTasks;
  repo.deleteTasks = function(tasks, cb) {
      _deleteTasks.call(repo, tasks, function(err) {
        if (err) return cb(err);
        repo.saveModifiedFiles(function(err, files) {
          cb(err, files)
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
        var oldChecksum = file.checksum;
        file.checksum = checksum(file.getContentForFile());
        fs.writeFile(filePath, file.getContentForFile(), 'utf8', function(err) {
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

  repo.getReadme = function() {
    var files = fs.readdirSync(repo.path);
    var file = files.find(function(filePath) {
      var regex = new RegExp(constants.DEFAULT_FILE_PATTERN, "i");
      return regex.test(filePath);
    });
    return file;
  };

  repo.getFilesInPath = function(includeDirs, cb) {
    cb = tools.cb(cb);
    ls(repo.path, function(err, allPaths) {
      if (err) return cb(err);
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
            var file = new File({repoId: repo.getId(), filePath: path, modifiedTime: stat.mtime, createdTime: stat.birthtime, languages: repo.languages});
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
      ls(path, function(err, files) {
        if (err) return cb(err);
        waitCount--;

        files = files.filter(function(file) {
          return !repo.shouldExclude(repo.getRelativePath(file));
        });
        files.forEach(file => {
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

    fs.lstat(filePath, function(err, stats) {
      if (err) return cb([new Error("Unable to stat file:" + filePath), err]);
      if (!stats.isFile()) return cb(null, file)
      fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) return cb([new Error("Unable to read file:" + filePath), err]);
        
        file.setContentFromFile(data)
        .setModifiedTime(stats.mtime)
        .setCreatedTime(stats.birthtime)

        file.lineCount = eol.split(data).length;
        cb(null, file);
      });
    });
  };

  repo.deleteFile = function(path, cb) {
    cb = tools.cb(cb);
    var file = File.isFile(path) ? path : repo.getFile(path);
    if (!_.isUndefined(file)) {
      fs.unlink(repo.getFullPath(file), function (err) {
        if (err) return cb("Unable to delete:" + path + " : " + err.toString());
        repo.removeFile(file);
        cb(null, file);
      });
    } else cb("Unable to delete:" + path);
  };

  repo.getTemplates = function(qry, cb) {
    var dir = repo.getFullPath(TEMPLATES_DIR);
    ls(dir, (err, files) => {
      files.forEach(file => {

      })
    })

    // TODO:190 Implement getTemplates id:39 gh:143 ic:gh
    //  - [ ] Test
  };

  return repo;
}
