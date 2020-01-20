'use strict';

var _                = require('lodash'),
    events           = require('events'),
    languages        = require('./languages'),
    util             = require('util'),
    query            = require('orql'),
    async            = require('async'),
    path             = require('path'),
    ignore           = require('ignore'),
    File             = require('./file'),
    Config           = require('./config'),
    tools            = require('./tools'),
    inMixinsNoop     = tools.inMixinsNoop,
    constants        = require('./constants'),
    log              = require('debug')('imdone-core:Repository'),
    List             = require('./list'),
    Task             = require('./task');

var ERRORS                = constants.ERRORS,
    DEFAULT_FILE_PATTERN  = constants.DEFAULT_FILE_PATTERN,
    ASYNC_LIMIT           = constants.ASYNC_LIMIT;

// Emits task.found, list.found, file.update and file.delete, file.processed, files.saved
// TODO:170 Emit file.saved for individual files being saved then update checksum in writeFile id:12 gh:97

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
  this.initialized = false;
  this.files = [];
  this.loadConfig(function(err, config) {
    if (err) return cb(err);
    self.config = config;
    self.readFiles(function(err, files) {
      self.initializing = false;
      self.initialized = true;
      if (err) {
        self.emit('initialized', {ok:false});
        return cb(err);
      }
      self.emit('initialized', {ok:true, lists:self.getTasksByList()});
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
  if (!this.config.plugins) return
  Object.entries(this.config.plugins).forEach(([name, config]) => {
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
  if (this.shouldEmitFileUpdate(file)) this.emit("file.update", file);
};

Repository.prototype.shouldEmitFileUpdate = function(file) {
  if (this.moving) return;
  if (this.lastMovedFiles) {
    var index = this.lastMovedFiles.indexOf(file);
    if (index > -1) {
      this.lastMovedFiles.splice(index, 1);
    } else {
      if (file && file.updated) return true;
    }
  } else {
    if (file && file.updated) return true;
  }
};

Repository.prototype.emitConfigUpdate = function(data) {
  if (this.savingConfig) return;
  this.emit("config.update",data);
};

/**
 * Description
 * @method createListeners
 * @return
 */
Repository.prototype.createListeners = function() {
  if (this.taskListener) return;
  var self = this;
  /**
   * Description
   * @method taskFoundListener
   * @param {} task
   * @return
   */
  this.taskListener = function(event, task) {
    if (!self.listExists(task.list)) {
      var list = _.pick(new List(task.getList()), "name", "hidden");
      list = new List(list.name, list.hidden);
      if (self.config.includeList(list.name)) self.addList(list);
      else if (/[\w\-]+?/.test(list.name)) self.addList(list);

      self.emit('list.found', list);
      self.saveConfig();
    }
    self.emit(event, task);
  };

  this.taskFoundListener = function(task) {
    self.taskListener('task.found', task);
  };

  this.taskModifiedListener = function(task) {
    self.taskListener('task.modified', task);
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
  if (!/[a-z]/.test(list.name)) {
    const codeList = list.name.replace(/\s+/g, '-').toUpperCase();
    if (!this.config.code.include_lists.find(name => name === codeList)) {
      this.config.code.include_lists.push(codeList);
    }
  }
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

Repository.prototype.isListVisible = function(name) {
  return this.getVisibleLists.find(list => list.name === name);
};

/**
 * Description
 * @method setLists
 * @param {} lists
 * @return ThisExpression
 */
Repository.prototype.setLists = function(lists) {
  this.config.lists = lists.map(list => {
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
  return this.getConfig().listExists(name);
};

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
  if (_.isFunction(includeDirs)) cb = includeDirs;
  cb(null, true);
};


Repository.prototype.setIgnores = function(ignores) {
  this.ignorePatterns = ignores;
  this.ignore = ignore().add(ignores);
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

   if (this.ignore) exclude = this.ignore.ignores(relPath);

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
      var index = self.files.findIndex(({path}) => path === file.path)
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
  return this.files.find(file => file.path === path)
};

Repository.prototype.getTask = function(id) {
  if (Task.isTask(id)) {
    let task = id
    if (!task.meta.id) return
    return this.getTasks().find(existingTask => {
      return (existingTask.meta.id && (existingTask.meta.id[0] == task.meta.id[0]))
    })
  } else {
    let task =  this.getTasks().find(task => task.id === id)
    return this.getFile(task.source.path).getTasks().find(task => task.id === id)
  }
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
  return this.files.filter(file => {
    return (_.indexOf(paths, file.path) > -1);
  });
};

Repository.prototype.getFilesWithTasks = function() {
  const files = this.files.filter(file => file.getTasks().length > 0)
  return _.sortBy(files, "path");
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
  var reset = (file) => {
    file.content = null;
    file.removeListener('task.found', self.taskFoundListener);
    file.removeListener('task.modified', self.taskModifiedListener);
  }
  var extract = (file) => {
    file.on('task.found', self.taskFoundListener);
    file.on('task.modified', self.taskModifiedListener);
    file.extractTasks(self.getConfig());
    if (!file.isModified()) {
      reset(file)
      return cb(null, file)
    }
    self.writeFile(file, (err, file) => {
      if (err) return cb(err)
      reset(file)
      cb(null, file)
    })
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
  const checksum = this.checksum || function() {}
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;

  var currentChecksum = file.checksum;
  if (!/\.\.(\/|\\)/.test(file.path)) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(new Error("Unable to read file:" + file));
      // if (file.getContent().trim() === '') this.emit('file.empty', file)
      file.checksum = checksum(file.getContent());
      file.updated = currentChecksum !== file.checksum;
      if (file.updated) self.extractTasks(file);
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
    if (files.length < 1) return cb(null, []);
    async.eachLimit(files, ASYNC_LIMIT, function(file, cb) {
      self.emit('file.reading', {path:file.path});
      self.readFile(file, function(err, file) {
        if (err) return cb(err);
        completed++;
        self.emit('file.read', {
          path:file.path,
          completed: completed
        });
        cb();
      });
    }, function(err) {
      cb(err, files);
    });
  };

  if (files === undefined) {
    if (this.files && this.files.length > 0) {
      exec(this.files);
    } else {
      this.getFilesInPath(false, (err, files) => {
        if (err) return cb(err);
        self.files = files;
        const filesToInclude = files.map(file => file.path)
        const fileStats = {count: filesToInclude.length, files: filesToInclude}
        this.emit('files.found', fileStats)
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
  var file = files.reverse().find(file => {
    var regex = new RegExp(DEFAULT_FILE_PATTERN, "i");
    return regex.test(file.path);
  });
  return file;
};

Repository.prototype.getList = function(name) {
  return this.getLists().find(list => list.name === name)
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
  if (oldName === newName) return cb();
  var self = this;
  var lists = this.getLists();
  // Find the index of the oldName
  var oldNameIndex = lists.findIndex(list => list.name === oldName)

  // If newName exists, remove the oldName
  if (lists.findIndex(list => list.name === newName) > -1) {
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
      if (!err) self.emit('list.modified', newName);
      cb(err);
    });
  };

  var funcs = tasksToModify.map(task => {
    return function(cb) {
      var file = self.getFileForTask(task);
      if (!files.find(({path}) => path === file.getPath())) {
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

  // TODO:200 Let's use saveModifiedFiles here id:15 gh:100 +fix

  if (funcs.length > 0) {
    async.series(funcs, function(err) {
      if (err) return cb(err);

      var fns = files.map(file => {
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

Repository.prototype.deleteTask = function(task, cb) {
  if (!cb) throw new Error("task, callback required");
  var self = this;
  var file = self.getFileForTask(task);
  if (!file.getContent()) {
    self.readFileContent(file, function(err, file) {
      if (err) return cb(err);
      file.deleteTask(task, self.getConfig());
      self.writeFile(file, true, cb);
    });
  } else {
    file.deleteTask(task, self.getConfig());
    self.writeFile(file, true, cb);
  }
};
Repository.prototype.deleteTasks = function(tasks, cb) {
  if (!cb) throw new Error("tasks, callback required");
  var self = this;
  
  let files = _.groupBy(tasks, task => task.source.path) // {path:tasks, path2:tasks}
  for (let [path, tasks] of Object.entries(files)) {
    files[path] = _.sortBy(tasks, 'line').reverse()
  }
  async.eachSeries(Object.entries(files), ([path, tasks], cb) => {
    async.eachSeries(tasks,function (task, cb) {
      task = new Task(task, true)
      var file = self.getFileForTask(task);
      if (!file.getContent()) {
        self.readFileContent(file, function(err, file) {
          if (err) return cb(err);
          file.deleteTask(task, self.getConfig());
          cb(null, task);
        });
      } else {
        file.deleteTask(task, self.getConfig());
        cb(null, task);
      }
    }, cb)
  }, cb)
};

Repository.prototype.modifyTaskFromHtml = function(task, html, cb) {
  cb = tools.cb(cb);
  var file = this.getFileForTask(task);
  if (!file.getContent()) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err);
      file.modifyTaskFromHtml(task, html);
      this.writeFile(file, true, cb);
    });
  } else {
    file.modifyTaskFromHtml(task, html);
    this.writeFile(file, true, cb);
  }
};

Repository.prototype.modifyTaskFromContent = function(task, content, cb) {
  cb = tools.cb(cb);
  var file = this.getFileForTask(task);
  if (!file.getContent()) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err);
      file.modifyTaskFromContent(task, content, this.getConfig());
      this.writeFile(file, true, cb);
    });
  } else {
    file.modifyTaskFromContent(task, content, this.getConfig());
    this.writeFile(file, true, cb);
  }
};

/**
 * Description
 * @method modifyTask
 * @param {} task
 * @return CallExpression
 */
Repository.prototype.modifyTask = function(task, writeFile, cb) {
  if (!Task.isTask(task)) return cb()
  if (_.isFunction(writeFile)) {
    cb = writeFile;
    writeFile = false;
  }
  cb = tools.cb(cb);
  log("Modifying Task... text:%s list:%s order:%d path:%s id:%s line:%d", task.text, task.list, task.order, task.source.path, task.id, task.line);
  var self = this;
  var file = this.getFileForTask(task);
  if (!file.getContent()) {
    this.readFileContent(file, function(err, file) {
      if (err) return cb(err);
      file.modifyTask(task, self.getConfig());
      if (writeFile) return self.writeFile(file, true, cb);
      cb(null, task);
    });
  } else {
    file.modifyTask(task, self.getConfig());
    if (writeFile) return self.writeFile(file, true, cb);
    cb(null, task);
  }
};

Repository.prototype.setTaskPriority = function(_task, index, cb) {
  if (_task.order === "") return cb();
   _task.order = index*10;
  cb();
};

Repository.prototype.moveTasks = function(tasks, newList, newPos, noEmit, cb) {
  var log = require('debug')('moveTasks');
  var self = this;
  if (this.getList(newList).filter) return cb(new Error(`Tasks can\'t be moved to a filtered list ${newList}.`))
  var listsModified = [newList];
  if (_.isFunction(noEmit)) {
    cb = noEmit;
    noEmit = false;
  }
  this.moving = true;
  cb = tools.cb(cb);

  log("Move tasks to list:%s at position:%d : %j", newList, newPos, tasks);
  log("newList before mods:", JSON.stringify(self.getTasksInList(newList), null, 3));

  var moveTask = function(task, newList, newPos, cb) {
    if (!Task.isTask(task)) task = new Task(task);
    if (listsModified.indexOf(task.list) < 0) listsModified.push(task.list);
    var toListTasks = self.getTasksInList(newList);
    if (toListTasks === undefined) return cb(new Error(ERRORS.LIST_NOT_FOUND, newList));

    var fromListTasks = self.getTasksInList(task.list);
    if (fromListTasks === undefined) return cb(new Error(ERRORS.LIST_NOT_FOUND, task.list));

    var sameList = (newList == task.list);
    if (!sameList) task.oldList = task.list;
    task.list = newList;

    // Move the task to the correct position in the list
    toListTasks = _.reject(toListTasks, function(_task) {
      return  _task.equals(task);
    });
    toListTasks.splice(newPos,0,task);

    if (!sameList) {
      fromListTasks = _.reject(fromListTasks, function(_task) {
        return  _task.equals(task);
      });
    }

    // Modify the task order
    const tasksToModify = []
    if (newPos === 0) { // is first
      task.order = 0
      if (toListTasks.length > 1) {
        const nextTask = toListTasks[1]
        if (toListTasks.length > 2) {
          const nextOrder = toListTasks[2].order
          nextTask.order = (nextOrder && nextOrder/2 > 0) ? nextOrder/2 : 10
        } else {
          nextTask.order = 10
        }
        tasksToModify.push(nextTask)
      } 
    } else if (newPos === toListTasks.length-1) { // is last
      const oldLastTask = toListTasks[toListTasks.length-2]
      const oldLastTaskOrder = oldLastTask.order || (toListTasks.length-2)*10
      task.order = oldLastTaskOrder + 10
    } else {
      const prevTask = toListTasks[newPos-1]
      const nextTask = toListTasks[newPos+1]
      const prevTaskOrder = prevTask.order || 0
      const nextTaskOrder = nextTask.order || 100
      task.order = prevTaskOrder + (nextTaskOrder - prevTaskOrder)/2
    }
    tasksToModify.push(task)

    async.eachSeries(tasksToModify, (task, cb) => {
      self.modifyTask(task, cb);
    }, err => {
      if (err) return cb([new Error("moveTasks: Error while modifying tasks in the current list"), err])
      cb(null, task)
    })
  };

  async.series(tasks.map((task, i) => {
    return function(cb) {
      moveTask(task, newList, newPos+i, cb);
    };
  }), function(err) {
    self.saveModifiedFiles(function(err, results) {
      self.lastMovedFiles = results;
      var tasksByList = listsModified.map(list => {
        return {
          list: list,
          tasks: self.getTasksInList(list)
        };
      });
      self.moving = false;
      cb(err, tasksByList);
      if (!err && !noEmit) self.emit('tasks.moved', tasks);
    });
  });

};

Repository.prototype.getModifiedFiles = function() {
  var filesToSave = [];
  this.getFiles().forEach(file => {
    if (file.isModified()) filesToSave.push(file);
  });
  return filesToSave;
};

Repository.prototype.saveModifiedFiles = function(cb) {
  const checksum = this.checksum || function() {}
  var self = this;
  var filesToSave = self.getModifiedFiles();
  var funcs = filesToSave.map(file => {
    return function(cb) {
      file.checksum = checksum(file.getContent());
      self.writeFile(file, false, cb);
    };
  });

  if (funcs.length < 1) return cb();
  this.savingFiles = true
  async.parallel(funcs, (err) => {
    this.savingFiles = false
    if (err) return cb(err);
    self.emit('files.saved', filesToSave);
    cb();
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
  this.getFiles().forEach(file => {
    Array.prototype.push.apply(tasks, file.getTasks());
  });

  return tasks;
};

Repository.prototype.getTasksByList = function(noSort) {
  return Repository.getTasksByList(this, this.getTasks(), noSort)
};

Repository.getTasksByList = function (repo, tasksAry, noSort) {
  var tasks = {};
  var allTasks = noSort ? tasksAry : _.sortBy(tasksAry, ['order', 'text'])
  allTasks.forEach(function(task) {
    if (!tasks[task.list]) tasks[task.list] = [];
    tasks[task.list].push(task);
  });
  var lists = _.cloneDeep(repo.getLists());
  lists.forEach(function(list) {
    if (list.filter) return repo.populateFilteredList(list)
    list.tasks = tasks[list.name] || [];
  });
  return lists;
}

Repository.prototype.populateFilteredList = function(list) {
  this.runFilteredListQuery(list)
};

Repository.prototype.runFilteredListQuery = function(list) {
  try {
    const filter = tools.replaceDateLanguage(list.filter)
    list.tasks = Repository.query(this.getTasks(), filter)
  } catch (e) {
    list.tasks = []
  }
}

/**
 * Description
 * @method getTasksInList
 * @param {} name
 * @return ConditionalExpression
 */
Repository.prototype.getTasksInList = function(name, offset, limit) {
  if (!_.isString(name)) return [];
  var tasks = _.where(this.getTasks(), {list: name});
  if (tasks.length === 0) return [];
  var allTasks = _.sortBy(_.where(tasks, {list:name}), ['order', 'text']);
  if (_.isNumber(offset) && _.isNumber(limit)) return allTasks.slice(offset, offset+limit);
  return allTasks;
};

Repository.prototype.getTaskIndex = function(task) {
  const tasks = this.getTasksInList(task.list)
  let index = 0
  tasks.forEach((t, i) => {
    if (t.id === task.id) index = i
  })
  return index
}

Repository.prototype.serialize = function() {
  return JSON.stringify(this, null, 3);
};

Repository.deserialize = function(repo, cb) {
  cb = tools.cb(cb);
  repo = JSON.parse(repo);
  var newRepo = new Repository(repo.path, repo.config);
  var count = 0;
  repo.files.forEach(file => {
    log("file:%j", file);
    newRepo.addFile(new File({file: file, languages: languages}), function(err) {
      if (err) return cb(err);
      count++;
      log("count:%d, repo.files.length:%d", count, repo.files.length);
      if (count == repo.files.length) cb(null, newRepo);
    });
  });
};

Repository.prototype.usingImdoneioForPriority = function() {
  return File.usingImdoneioForPriority(this.config);
};

Repository.prototype.getTemplates = function(qry, cb) {
  inMixinsNoop(cb);
};

Repository.prototype.saveWorkflow = function(name, cb) {
  if (!this.config.workflows) this.config.workflows = {};
  this.config.workflows[name] = _.cloneDeep(this.getLists());
  // TODO:260 saveConfig id:33 gh:135 ic:gh

};

Repository.prototype.deleteWorkflow = function(name, cb) {
  // TODO:230 implement deleteWorkflow id:35 gh:137 ic:gh

};

Repository.prototype.applyWorkflow = function(name) {
  // TODO:220 implement applyWorkflow id:37 gh:139 ic:gh

};

Repository.rqlQuery = function(tasks, queryString) {
  let result = []
  try {
    queryString = queryString.replace(/\//g,'%2F').replace(/:/g,'%3A')
    tasks = JSON.parse(JSON.stringify(tasks))
    result = query(tasks, queryString)
  } catch (e) {
    console.log(`Unable to parse rql query: ${queryString}`, e)
  }
  return result
}

Repository.regexQuery = function(tasks, queryString) {
  return tasks.filter(task => {
    if (task.rawTask.search(new RegExp(tools.escapeRegExp(queryString),'i')) > -1) return true
    for (let i in task.description) {
      if (task.description[i].search(new RegExp(tools.escapeRegExp(queryString),'i')) > -1) return true
    }
  })
}

Repository.query = function(tasks, queryString) {
  let result = Repository.rqlQuery(tasks, queryString)
  if (result.length === 0) result = Repository.regexQuery(tasks, queryString)
  return result
}

Repository.prototype.query = function(queryString) {
  const result = Repository.query(this.getTasks(), queryString)
  return Repository.getTasksByList(this, result)
}

module.exports = Repository;
