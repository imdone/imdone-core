'use strict';

var _                = require('lodash'),
    events           = require('events'),
    languages        = require('./languages'),
    util             = require('util'),
    async            = require('async'),
    path             = require('path'),
    marked           = require('marked'),
    minimatch        = require('minimatch'),
    File             = require('./file'),
    Config           = require('./config'),
    tools            = require('./tools'),
    inMixinsNoop     = tools.inMixinsNoop,
    constants        = require('./constants'),
    log              = require('debug')('imdone-core:Repository'),
    List             = require('./list'),
    Task             = require('./task');

var ERRORS                = constants.ERRORS,
    DEFAULT_FILE_PATTERN  = constants.DEFAULT_FILE_PATTERN;

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

function Repository(_path, config) {
  var self = this;

  events.EventEmitter.call(this);
  // path is the root path of the repository
  this.config = config;
  this.path = _path;
  this.files = [];
  this.languages = languages;
  this.plugins = {};
}

util.inherits(Repository, events.EventEmitter);

/**
 * Implemented in mixins
 * @method init
 * @param {} cb
 * @return
 */
Repository.prototype.init = function(cb) {
  inMixinsNoop(cb);
};

Repository.prototype.refresh = function(cb) {
  cb = tools.cb(cb);
  if (this.initializing) return cb(new Error('initializing'));
  var self = this;
  this.initializing = true;
  this.files = undefined;
  delete this.config;
  this.loadConfig(function(err, config) {
    if (err) return cb(err);
    self.config = config;
    self.readFiles(function(err, files) {
      self.initializing = false;
      if (err) {
        self.emit('initialized', {ok:false});
        return cb(err);
      }
      self.emit('initialized', {ok:true});
      if (cb) cb(err, files);
    });
  });
};


/**
 * Description
 * @method destroy
 * @return
 */
Repository.prototype.destroy = function() {
  this.destroyed = true;
  this.removeAllListeners();
};

/**
 * Initializes all plugins
 * @method initPlugins
 * @return
 */
Repository.prototype.initPlugins = function() {
  var self = this;
  _.each(this.config.plugins, function(config, name) {
    self.initPlugin(name, config);
  });
};

/**
 * Initializes a single plugin
 * @method initPlugin
 * @return
 */
Repository.prototype.initPlugin = function(name, config) {
  var pluginPath, _path;
  // First try to resolve the plugin in the paths node_modules
  try {
    _path = path.join(this.path, 'node_modules', name);
    log('Looking for plugin:%s', _path);
    require.resolve(_path);
    pluginPath = _path;
  } catch (e) {}

  // Now check the users home node_modules
  if (!pluginPath) {
    try {
      _path = path.join(tools.userHome(), 'node_modules', name);
      log('Looking for plugin:%s', _path);
      require.resolve(_path);
      pluginPath = _path;
    } catch (e) {}
  }

  // Now just try to load the module by name
  if (!pluginPath) {
    try {
      log('Looking for plugin:%s', name);
      require.resolve(name);
      pluginPath = name;
    } catch (e) {}
  }

  if (pluginPath) {
    log('Found plugin:%s', pluginPath);
    this.plugins[pluginPath] = require(pluginPath)(config, this);
    try {
      this.plugins[pluginPath]._pkg = require(pluginPath+'/package');
    } catch (err) {
      this.plugins[pluginPath]._pkg = {};
    }
  }
};

/**
 * Get a plugin by package name
 * @method plugin
 * @return The named plugin object or undefined
 */
Repository.prototype.plugin = function(name) {
  return this.plugins[name];
};

/**
 * Get all the plugins
 * @method getPlugins
 * @return The plugins hash
 */
Repository.prototype.getPlugins = function() {
  return this.plugins;
};

/**
 * Add a plugin
 * @method plugin
 * @return this for chaining
 */
Repository.prototype.addPlugin = function(name, config) {
  this.initPlugin(name, config);
  if (this.config.plugins === undefined) this.config.plugins = {};
  this.config.plugins[name] = config;
};

/**
 * Description
 * @method getId
 * @return CallExpression
 */
Repository.prototype.getId = function() {
  return this.getPath();
};

Repository.prototype.getProject = function() {
  return this.project;
};

Repository.prototype.getDisplayName = function() {
  return path.basename(this.path);
};

Repository.prototype.emitFileUpdate = function(file) {
  if (this.moving) return;
  if (this.lastMovedFiles) {
    var index = this.lastMovedFiles.indexOf(file);
    if (index > -1) {
      this.lastMovedFiles.splice(index, 1);
    } else {
      this.emit("file.update", file);
    }
  } else {
    this.emit("file.update", file);
  }
};

Repository.prototype.emitConfigUpdate = function(data) {
  if (this.savingConfig) {
    this.savingConfig = false;
    return;
  }
  this.emit("config.update",data);
};

/**
 * Description
 * @method createListeners
 * @return
 */
Repository.prototype.createListeners = function() {
  var self = this;
  /**
   * Description
   * @method taskFoundListener
   * @param {} task
   * @return
   */
  this.taskFoundListener = function(task) {
    if (!self.listExists(task.list)) {
      var list = _.pick(new List(task.getList()), "name", "hidden");
      list = new List(list.name, list.hidden);
      self.addList(list);
      self.emit('list.found', list);
      self.saveConfig();
    }
    self.emit('task.found', task);
  };
};


/**
 * Description
 * @method addList
 * @param {} list
 * @return
 */
Repository.prototype.addList = function(list, cb) {
  cb = tools.cb(cb);
  if (this.listExists(list.name)) return cb();
  var self = this;
  var fn = function(err) {
    if (!err) self.emit('list.modified', list);
    cb(err);
  };
  list = _.omit(list, "tasks");
  this.config.lists.push(new List(list.name, list.hidden));
  this.saveConfig(fn);
};

Repository.prototype.removeList = function(list, cb) {
  cb = tools.cb(cb);
  if (!this.listExists(list)) return cb();
  var self = this;
  var fn = function(err) {
    if (!err) self.emit('list.modified', list);
    cb(err);
  };
  var lists = _.reject(this.getLists(), {name:list});
  this.setLists(lists);
  this.saveConfig(fn);
};

/**
 * Description
 * @method getPath
 * @return MemberExpression
 */
Repository.prototype.getPath = function() {
  return this.path;
};

/**
 * Description
 * @method getConfig
 * @return MemberExpression
 */
Repository.prototype.getConfig = function() {
  return this.config;
};

/**
 * Description
 * @method getLists
 * @return MemberExpression
 */
Repository.prototype.getLists = function() {
  return this.getConfig().lists;
};

Repository.prototype.getVisibleLists = function() {
  return _.reject(this.getLists(), 'hidden');
};

/**
 * Description
 * @method setLists
 * @param {} lists
 * @return ThisExpression
 */
Repository.prototype.setLists = function(lists) {
  this.config.lists = _.map(lists, function(list) {
    return new List(list.name, list.hidden);
  });
  return this;
};

/**
 * Description
 * @method listExists
 * @param {} name
 * @return BinaryExpression
 */
Repository.prototype.listExists = function(name) {
  return (_.findIndex(this.getLists(), { name: name }) > -1);
};

// [Make sure lists are not saved on load in alphabetical order](#ARCHIVE:170)
/**
 * Save the config file (Implemented in mixins)
 *
 * @method saveConfig
 * @param {} cb
 * @return
 */
Repository.prototype.saveConfig = function(cb) {
  inMixinsNoop(cb);
};

/**
 * Load the config file (Implemented in mixins)
 *
 * @method loadConfig
 * @return MemberExpression
 */
Repository.prototype.loadConfig = function(cb) {
  inMixinsNoop(cb);
};

/**
 * Set the exclude patterns array in config
 *
 * @method setExcludePatterns
 * @param {} patterns
 * @return
 */
Repository.prototype.setExcludePatterns = function(patterns) {
  this.config.excludePatterns = patterns;
};

/**
 * Get the full path from a relative path
 *
 * @method getFullPath
 * @param {} file
 * @return String
 */
Repository.prototype.getFullPath = function(file) {
  if (File.isFile(file)) file = file.path;
  if (file.indexOf(this.path) === 0) return file;
  try {
    var fullPath = path.join(this.path,file);
    return fullPath;
  } catch (e) {
    throw new Error(util.format("Error getting full path for file:%s and repo path:%s", file, this.path));
  }
};

/**
 * Get the relative path from repository root
 *
 * @method getRelativePath
 * @param {} fullPath
 * @return String
 */
Repository.prototype.getRelativePath = function(fullPath) {
  try {
    var relPath = path.relative(this.path, fullPath);
    return relPath;
  } catch (e) {
    throw new Error(util.format("Error getting relative path for file:%s and repo path:%s", fullPath, this.path));
  }
};

/**
 * Is this file OK?  Implemented in mixins
 *
 * @method fileOK
 * @param {} file
 * @param {} includeDirs
 * @return stat
 */
Repository.prototype.fileOK = function(file, includeDirs, cb) {
  if (_.isFunction(includeDirs)) cb= includeDirs;
  cb(null, true);
};

/**
 * Should the relative path be excluded.  Based on exludes regex patterns in config
 *
 * @method shouldExclude
 * @param {} relPath
 * @return exclude
 */
Repository.prototype.shouldExclude = function(relPath) {
  var exclude = false;
  _.each(this.config.exclude, function(pattern) {
    if ((new RegExp(pattern)).test(relPath)) {
      exclude = true;
      return false;
    }
  });
  if (this.ignores) {
    _.each(this.ignores, function(pattern) {
      if ((new RegExp(pattern)).test(relPath)) {
        exclude = true;
        return false;
      }
    });
  }
  if (this.globs) {
    _.each(this.globs, function(pattern) {
      if (minimatch(relPath, pattern)) {
        exclude = true;
        return false;
      }
    });
  }

  log("Exclude:%s | %s", relPath, exclude);

  return exclude;
};

/**
 * Add or replace a file in the files reference array
 *
 * @method addFile
 * @param {} file
 * @return MemberExpression
 */
Repository.prototype.addFile = function(file, cb) {
  if (this.destroyed) return cb(new Error('destroyed'));
  var self = this;
  this.fileOK(file, function(err, ok) {
    if (ok) {
      var index = _.findIndex(self.files, {path:file.path});
      if (index > -1) {
        self.files[index] = file;
      } else {
        self.files.push(file);
      }
    }
    cb(err, self.files);
  });
};

/**
 * Remove a file from the files refrence array
 *
 * @method removeFile
 * @param {} file
 * @return MemberExpression
 */
Repository.prototype.removeFile = function(file) {
  if (!File.isFile(file)) throw new Error(ERRORS.NOT_A_FILE);
  this.files = _.reject(this.files, {path:file.path});

  return this.files;
};

/**
 * Description
 * @method getFile
 * @param {} path
 * @return CallExpression
 */
Repository.prototype.getFile = function(path) {
  return _.find(this.files, {path:path});
};

Repository.prototype.getTask = function(id) {
  return _.find(this.getTasks(), {id: id});
};

/**
 * Description
 * @method getFileForTask
 * @param {} task
 * @return CallExpression
 */
Repository.prototype.getFileForTask = function(task) {
  return this.getFile(task.getSource().path);
};

/**
 * Descriptione
 * @method getFiles
 * @param {} paths
 * @return CallExpression
 */
Repository.prototype.getFiles = function(paths) {
  if (_.isUndefined(paths)) return _.sortBy(this.files, "path");
  return _.filter(this.files, function(file) {
    return (_.indexOf(paths, file.path) > -1);
  });
};

/**
 * Description
 * @method extractTasks
 * @param {} file
 * @return
 */
Repository.prototype.extractTasks = function(file, cb) {
  cb = tools.cb(cb);
  var self = this;
  file.on('task.found', this.taskFoundListener);
  var extract = function(file) {
    file.extractTasks(self.getConfig());
    file.content = null;
    file.removeListener('task.found', self.taskFoundListener);
    cb(null, file);
  };

  if (file.content === null) {
    this.readFileContent(file, function(err, file) {
      if (err) return cb(err);
      extract(file);
    });
  } else extract(file);
};

/**
 * Implemented in mixins
 * @method writeFile
 * @param {} file
 * @param {} cb
 * @return
 */
Repository.prototype.writeFile = function(file, cb) {
  inMixinsNoop(cb);
};

/**
 * Implemented in mixins
 * @method getFilesInPath
 * @param {} includeDirs
 * @return CallExpression
 */
// #ARCHIVE:80 Make all calls to getFilesInPath async
Repository.prototype.getFilesInPath = function(includeDirs, cb) {
  inMixinsNoop(cb);
};

/**
 * Implemented in mixins
 * @method getFileTree
 * @param {} _path
 * @return out
 */
Repository.prototype.getFileTree = function(_path) {
  return {dirs:[], files:[]};
};

/**
 * Get html for md file
 * @method md
 * @param {} file
 * @param {} cb
 * @return String html
 */
Repository.prototype.md = function(file, cb) {
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  if (!file.isMarkDownFile()) return cb(new Error("File is not markdown"));
  var self = this;
  this.readFileContent(file, function(err, file) {
    if (err) return cb(err);
    file.md(self.getConfig().marked, cb);
  });
};

/**
 * Implemented in mixins
 * @method readFileContent
 * @param {} file
 * @param {} cb
 * @return
 */
Repository.prototype.readFileContent = function(file, cb) {
  inMixinsNoop(cb);
};

/**
 * Description
 * @method readFile
 * @param {} file
 * @param {} cb
 * @return
 */
Repository.prototype.readFile = function(file, cb) {
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;

  if (!/\.\.(\/|\\)/.test(file.path)) {
    this.readFileContent(file, function(err, file) {
      if (err) return cb(new Error("Unable to read file:" + file));
      self.extractTasks(file);
      self.addFile(file, function(err) {
        log('error:', err);
        log('File added %j', file, null);
        if (err) return cb(err);
        cb(null, file);
      });
    });
  } else return cb(new Error("Unable to read file:" + file));
};

/**
 * Description
 * @method readFiles
 * @param {} files
 * @param {} cb
 * @return
 */
Repository.prototype.readFiles = function(files, cb) {
  if (arguments.length === 0) { cb = _.noop; files = undefined; }
  else if (_.isFunction(files)) { cb = files; files = undefined; }
  else if (files && !_.isArray(files)) return cb(new Error("files must be an array of files or undefined"));

  cb = tools.cb(cb);

  var self = this;
  var exec = function(files) {
    var completed = 0;
    var funcs = _.map(files, function(file) {
      return function(cb) {
        self.emit('file.reading', {path:file.path});
        self.readFile(file, function(err, file) {
          if (err) return cb(err);
          completed++;
          self.emit('file.read', {
            path:file.path,
            completed: completed
          });
          cb(err, file);
        });
      };
    });

    if (funcs.length > 0) async.parallelLimit(funcs, 40, cb);
    else cb(null, []);
  };

  if (files === undefined) {
    if (this.files && this.files.length > 0) {
      exec(this.files);
    } else {
      this.getFilesInPath(false, function(err, files) {
        log("Found files in path:", files);
        self.files = files;
        exec(files);
      });
    }
  } else exec(files);

};

/**
 * Implemented in mixins
 * @method deleteFile
 * @param {} path
 * @param {} cb
 * @return
 */
Repository.prototype.deleteFile = function(path, cb) {
  inMixinsNoop(cb);
};

/**
 * Description
 * @method hasDefaultFile
 * @return CallExpression
 */
Repository.prototype.hasDefaultFile = function() {
  return _.some(this.getFiles(), function(file) {
    var regex = new RegExp(DEFAULT_FILE_PATTERN, "i");
    return regex.test(file.path);
  });
};

/**
 * Description
 * @method getDefaultFile
 * @return file
 */
Repository.prototype.getDefaultFile = function() {
  var files = _.sortBy(this.getFiles(), function(file) { return file.path; });
  var file = _.find(files.reverse(), function(file) {
    var regex = new RegExp(DEFAULT_FILE_PATTERN, "i");
    return regex.test(file.path);
  });
  return file;
};

Repository.prototype.getList = function(name) {
  return _.find(this.getLists(), {name:name});
};

Repository.prototype.hideList = function(name, cb) {
  var self = this;
  cb = tools.cb(cb);
  var fn = function(err) {
    if (!err) self.emit('list.modified', name);
    cb(err);
  };

  var list = this.getList(name);
  if (list) {
    list.hidden = true;
    this.saveConfig(fn);
  } else cb();
};

Repository.prototype.showList = function(name, cb) {
  var self = this;
  cb = tools.cb(cb);
  var fn = function(err) {
    if (!err) self.emit('list.modified', name);
    cb(err);
  };

  var list = this.getList(name);
  if (list) {
    list.hidden = false;
    this.saveConfig(fn);
  } else cb();
};

/**
 * Description
 * @method moveList
 * @param {} name
 * @param {} pos
 * @param {} cb
 * @return
 */
Repository.prototype.moveList = function(name, pos, cb) {
  var self = this;
  cb = tools.cb(cb);
  var list = this.getList(name);
  // Only modify the lists if the list name exists
  var fn = function(err) {
    if (!err) self.emit('list.modified', name);
    cb(err);
  };

  if (list) {
    _.remove(this.getLists(), {name:name});
    this.getLists().splice(pos, 0, list);
    this.saveConfig(fn);
  } else cb();
};

// [Test renameList](#ARCHIVE:280)
/**
 * Description
 * @method renameList
 * @param {} oldName
 * @param {} newName
 * @param {} cb
 * @return
 */
Repository.prototype.renameList = function(oldName, newName, cb) {
  cb = tools.cb(cb);
  var self = this;
  var lists = this.getLists();
  // Find the index of the oldName
  var oldNameIndex = _.findIndex(lists, {name: oldName});

  // If newName exists, remove the oldName
  if (_.findIndex(lists, {name: newName}) > -1) {
    lists.splice(oldNameIndex, 1);
  // Otherwise rename it
  } else {
    lists[oldNameIndex].name = newName;
  }

  this.setLists(lists);

  // Modify the tasks
  var files = [];
  var tasksToModify = this.getTasksInList(oldName);

  var modifyTask = function(task, file, cb) {
    task.list = newName;
    file.modifyTask(task, self.getConfig());
    cb(null);
  };

  var fn = function(err) {
    if (err) return cb(err);
    self.saveConfig(function(err) {
      if (!err) self.emit('list.modified');
      cb(err);
    });
  };

  var funcs = _.map(tasksToModify, function(task) {
    return function(cb) {
      var file = self.getFileForTask(task);
      if (!_.find(files, {path: file.getPath()})) {
        self.readFileContent(file, function(err) {
          if (err) return cb(err);
          files.push(file);
          modifyTask(task, file, cb);
        });
      } else {
        modifyTask(task, file, cb);
      }
    };
  });

  if (funcs.length > 0) {
    async.series(funcs, function(err) {
      if (err) return cb(err);

      var fns = _.map(files, function(file) {
        return function(cb) {
          self.writeFile(file, cb);
        };
      });

      if (fns.length > 0) {
        async.parallel(fns, fn);
      } else cb();
    });
  } else fn();

};

// #ARCHIVE:100 modifyTask must be async.  Get file content before proceeding.
/**
 * Description
 * @method modifyTask
 * @param {} task
 * @return CallExpression
 */
Repository.prototype.modifyTask = function(task, cb) {
  log("Modifying Task... text:%s list:%s order:%d path:%s id:%s line:%d", task.text, task.list, task.order, task.source.path, task.id, task.line);
  var self = this;
  var file = this.getFileForTask(task);
  if (!file.getContent()) {
    this.readFileContent(file, function(err, file) {
      if (err) return cb(err);
      cb(null, file.modifyTask(task, self.getConfig()));
    });
  } else {
    cb(null, file.modifyTask(task, self.getConfig()));
  }
};

// #ARCHIVE:120 Implement moveTasks
Repository.prototype.moveTasks = function(tasks, newList, newPos, cb) {
  var log = require('debug')('moveTasks');
  var self = this;
  this.moving = true;
  cb = tools.cb(cb);

  log("Move tasks to list:%s at position:%d : %j", newList, newPos, tasks);
  log("newList before mods:", JSON.stringify(self.getTasksInList(newList), null, 3));
  var moveTask = function(task, newList, newPos, cb) {
    if (!Task.isTask(task)) task = new Task(task);
    var toListTasks = self.getTasksInList(newList);
    if (toListTasks === undefined) return cb(new Error(ERRORS.LIST_NOT_FOUND, newList));

    var fromListTasks = self.getTasksInList(task.list);
    if (fromListTasks === undefined) return cb(new Error(ERRORS.LIST_NOT_FOUND, task.list));
    var sameList = (newList == task.list);
    task.list = newList;

    // Move the task to the correct position in the list
    toListTasks = _.reject(toListTasks, function(_task) {
      return  _task.equals(task);
    });
    toListTasks.splice(newPos,0,task);
    // Modify the tasks in current list
    async.series(_.map(toListTasks, function(_task, index) {
      return function(cb) {
        _task.order = index*10;
        self.modifyTask(_task, cb);
      };
    }), function(err, results) {
      if (err) return cb([new Error("moveTasks: Error while modifying tasks in the current list"), err]);

      // Remove the task from the old list
      if (!sameList) {
        fromListTasks = _.reject(fromListTasks, function(_task) {
          return  _task.equals(task);
        });

        async.series(_.map(fromListTasks, function(_task, index) {
          return function(cb) {
            _task.order = index*10;
            self.modifyTask(_task, cb);
          };
        }), cb);
      } else cb(null, task);
    });
  };

  async.series(_.map(tasks, function(task, i) {
    return function(cb) {
      log("Moving task with id:%d to %d in %s", task.id, newPos+i, newList);
      moveTask(task, newList, newPos+i, cb);
    };
  }), function(err, results) {
    log("modified list:", JSON.stringify(self.getTasksInList(newList), null, 3));
    var filesToSave = [];
    _.each(self.getFiles(), function(file) {
      if (file.isModified()) filesToSave.push(file);
    });

    var funcs = _.map(filesToSave, function(file) {
      return function(cb) {
        self.writeFile(file, cb);
      };
    });

    if (funcs.length > 0) {
      async.parallel(funcs, function(err, results) {
        if (!err) self.emit('tasks.move', tasks);
        self.lastMovedFiles = results;
        self.moving = false;
        cb(err, results);
      });
    } else {
      cb();
    }
  });

};

/**
 * Description
 * @method getTasks
 * @return tasks
 */
Repository.prototype.getTasks = function() {
  var tasks = [],
      self = this;
  _.each(this.getFiles(), function(file) {
    Array.prototype.push.apply(tasks, file.getTasks());
  });

  return tasks;
};

Repository.prototype.getTasksByList = function() {
  var tasks = {};
  _.sortBy(this.getTasks(), ['order', 'text']).forEach(function(task) {
    if (!tasks[task.list]) tasks[task.list] = [];
    tasks[task.list].push(task);
  });
  var lists = _.cloneDeep(this.getLists());
  lists.forEach(function(list) {
    list.tasks = tasks[list.name];
  });
  return lists;
};


/**
 * Description
 * @method getTasksInList
 * @param {} name
 * @return ConditionalExpression
 */
Repository.prototype.getTasksInList = function(name, offset, limit) {
  var tasks = this.getTasks();
  var allTasks = (tasks.length > 0) ? _.sortBy(_.where(tasks, {list:name}), ['order', 'text']) : [];
  if (_.isNumber(offset) && _.isNumber(limit)) return allTasks.slice(offset, offset+limit);
  else return allTasks;
};

Repository.prototype.serialize = function() {
  return JSON.stringify(this, null, 3);
};

Repository.deserialize = function(repo, cb) {
  cb = tools.cb(cb);
  repo = JSON.parse(repo);
  var newRepo = new Repository(repo.path, repo.config);
  var count = 0;
  _.each(repo.files, function(file) {
    log("file:%j", file);
    newRepo.addFile(new File({file: file, languages: languages}), function(err) {
      if (err) return cb(err);
      count++;
      log("count:%d, repo.files.length:%d", count, repo.files.length);
      if (count == repo.files.length) cb(null, newRepo);
    });
  });
};

module.exports = Repository;
