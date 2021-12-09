'use strict';

var _get             = require('lodash.get'),
    _cloneDeep       = require('lodash.clonedeep'),
    _isObject        = require('lodash.isobject'),
    _isFunction      = require('lodash.isfunction'),
    _isUndefined     = require('lodash.isundefined'),
    _isString        = require('lodash.isstring'),
    _isNumber        = require('lodash.isnumber'),
    _omit            = require('lodash.omit'),
    _reject          = require('lodash.reject'),
    _noop            = require('lodash.noop'),
    _some            = require('lodash.some'),
    _remove          = require('lodash.remove'),
    _groupBy         = require('lodash.groupby'),
    _where           = require('lodash.where'),
    _template        = require('lodash.template'),
    events           = require('events'),
    languages        = require('./languages'),
    util             = require('util'),
    async            = require('async'),
    path             = require('path'),
    ignore           = require('ignore'),
    File             = require('./file'),
    Config           = require('./config'),
    eol              = require('eol'),
    tools            = require('./tools'),
    inMixinsNoop     = tools.inMixinsNoop,
    constants        = require('./constants'),
    log              = require('debug')('imdone-core:Repository'),
    List             = require('./list'),
    monquery         = require('monquery'),
    sift             = require('sift'),
    fastSort         = require('fast-sort/dist/sort.js'),
    JSONfns          = require('json-fns'),
    functionRegex    = require('function-regex'),
    Task             = require('./task');

var ERRORS                = constants.ERRORS,
    DEFAULT_FILE_PATTERN  = constants.DEFAULT_FILE_PATTERN,
    ASYNC_LIMIT           = constants.ASYNC_LIMIT,
    DEFAULT_SORT          = [{asc: 'order'}, {asc: 'text'}];

// Emits task.found, list.found, file.update and file.delete, file.processed, files.saved

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
    if (err) {
      self.initializing = false
      return cb(err);
    }
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

Repository.prototype.emitFileUpdate = function(file, force) {
  if (force || this.shouldEmitFileUpdate(file)) this.emit("file.update", file);
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
    if (!self.listExists(task.list) && self.config.includeList(task.list)) {
      const list = new List({name: task.list})
      self.addList(list);
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
  list = _omit(list, "tasks");
  this.config.lists.push(new List(list));
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

  var lists = _reject(this.getLists(), {name:list});
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
  return _reject(this.getLists(), 'hidden');
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
    return new List(list);
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

Repository.prototype.migrateTasksByConfig = function(oldConfig, newConfig, cb) {
  if (!oldConfig || !newConfig) return cb()
  const oldMetaSep = oldConfig.getMetaSep()
  const newMetaSep = newConfig.getMetaSep()
  if (oldMetaSep === newMetaSep) return cb()
  async.eachLimit(this.getFiles(), ASYNC_LIMIT, (file, cb) => {
    const tasks = fastSort(file.tasks).by({desc: 'line'});
    async.eachSeries(tasks, (task, cb) => {
      if (!Task.isTask(task)) return cb()
      task.replaceMetaSep(oldMetaSep, newMetaSep)
      this.modifyTask(task, false, cb)
    }, err => {
      if (err) return cb(err)
      if (!file.isModified() || file.getContent().trim() === '') return cb()
      this.writeFile(file, (err, file) => {
        this.resetFile(file)
        if (err) return cb(err)
        cb(null, file)
      })
    })
  }, cb)
}


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
  if (_isFunction(includeDirs)) cb = includeDirs;
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
  this.files = _reject(this.files, {path:file.path});

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
  if (_isUndefined(paths)) return fastSort(this.files).by({asc: 'path'});
  return this.files.filter(file => {
    return paths.includes(file.path)
  });
};

Repository.prototype.getFilesWithTasks = function() {
  const files = this.files.filter(file => file.getTasks().length > 0)
  return fastSort(files).by({asc: 'path'});
};

Repository.prototype.resetFile = function(file) {
  file.content = null;
  file.removeListener('task.found', this.taskFoundListener);
  file.removeListener('task.modified', this.taskModifiedListener);
}

Repository.prototype.extractTasks = function(file, cb) {
  cb = tools.cb(cb);
  var self = this;
  var extract = (file) => {
    file.on('task.found', self.taskFoundListener);
    file.on('task.modified', self.taskModifiedListener);
    const fileContent = file.content
    file.extractAndTransformTasks(self.getConfig());
    if (!file.isModified() || fileContent === file.content) {
      this.resetFile(file)
      return cb(null, file)
    }
    file.extractTasks(self.getConfig())
    self.writeFile(file, (err, file) => {
      this.resetFile(file)
      if (err) return cb(err)
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
      // TODO: Allow user to assign a module for content transformation
      file.checksum = checksum(file.getContent());
      file.updated = currentChecksum !== file.checksum;
      if (file.updated) self.extractTasks(file, err => {
        if (err) return cb(err)
        self.addFile(file, err => {
          log('error:', err);
          log('File added %j', file, null);
          if (err) return cb(err);
          cb(null, file);
        });
      });
      else cb(null, file)
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
  if (arguments.length === 0) { cb = _noop; files = undefined; }
  else if (_isFunction(files)) { cb = files; files = undefined; }
  else if (files && !Array.isArray(files)) return cb(new Error("files must be an array of files or undefined"));

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
  return _some(this.getFiles(), function(file) {
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
  var files = fastSort(this.getFiles()).by({asc: 'path'});
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
    _remove(this.getLists(), {name:name});
    this.getLists().splice(pos, 0, list);
    this.saveConfig(fn);
  } else cb();
};

Repository.prototype.toggleListIgnore = function(name, cb) {
  var self = this;
  cb = tools.cb(cb);
  var list = this.getList(name);
  // Only modify the lists if the list name exists
  var fn = function(err) {
    if (!err) self.emit('list.modified', name);
    cb(err);
  };

  if (list) {
    list.ignore = !list.ignore
    this.saveConfig(fn);
  } else cb();
};

Repository.prototype.toggleList = function(name, cb) {
  var self = this;
  cb = tools.cb(cb);
  var list = this.getList(name);
  // Only modify the lists if the list name exists
  var fn = function(err) {
    if (!err) self.emit('list.modified', name);
    cb(err);
  };

  if (list) {
    list.hidden = !list.hidden
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

  if (lists.find(list => list.name === newName)) {
    return cb(new Error('List already exists'))
  }
  
  // Change the list name
  const listToChange = lists.find(list => list.name === oldName)
  listToChange.name = newName
  this.setLists(lists);

  // Change the filtered list name
  if (listToChange.filter) {
    const filteredLists = this.config.settings.filteredLists
    const filteredListToChange = filteredLists.find(list => list.name === oldName)
    filteredListToChange.name = newName
    this.saveConfig(err => {
      if (err) return cb(err)
      cb(null, {oldName, newName});
    })
    return
  }
  
  // Modify the tasks
  const tasksToModify = this.getTasksInList(oldName);

  const cbfn = (err) => {
    this.moving = false
    if (err) return cb(err) 
    this.saveConfig(err => {
      if (err) return cb(err)
      cb(null, {oldName, newName});
    })
  };

  const tasksByFile = {} // path: [files]
  tasksToModify.forEach(task => {
    const filePath = task.path
    if (!tasksByFile[filePath]) {
      tasksByFile[filePath] = {file: this.getFileForTask(task), tasks: []}
    }
    tasksByFile[filePath].tasks.push(task)
  })
  const modifyTasks = Object.values(tasksByFile).map(({file, tasks}) => {
    return (cb) => {
      this.readFileContent(file, err => {
        if (err) return cb(err)
        try {
          tasks.forEach(task => {
            task.list = newName;
            file.modifyTask(task, this.getConfig(), true);
          })
        } catch (err) {
          return cb(err)
        }
        cb()
      })
    }
  })

  // TODO:200 Let's use saveModifiedFiles here id:15 gh:100 +fix

  this.moving = true
  if (modifyTasks.length > 0) {
    async.parallel(modifyTasks, (err) => {
      if (err) return cb(err);

      var fns = Object.values(tasksByFile).map(({file}) => {
        return (cb) => {
          this.writeFile(file, cb);
        };
      });

      if (fns.length > 0) {
        async.parallel(fns, cbfn);
      } else  {
        cbfn()
      }
    });
  } else cbfn();
};

Repository.prototype.writeAndExtract = function (file, emit, cb) {
  this.writeFile(file, emit, (err, file) => {
    if (err) return cb(new Error("Unable to write file:" + file.path));
    this.extractTasks(file, (err, file) => {
      if (err) return cb(new Error("Unable to extract tasks for file:" + file.path));
      this.addFile(file, (err) => {
        if (err) return cb(new Error("Unable to add file:" + file.path));
        cb(null, file);
      });
    });      
  })
}

Repository.prototype.writeAndAdd = function (file, emit, cb) {
  this.writeFile(file, emit, (err, file) => {
    if (err) return cb(new Error("Unable to write file:" + file.path));
    this.addFile(file, (err) => {
      if (err) return cb(new Error("Unable to add file:" + file.path));
      cb(null, file);
    });
  })
}

Repository.prototype.deleteTask = function(task, cb) {
  if (!cb) throw new Error("task, callback required");
  var self = this;
  var file = self.getFileForTask(task);
  if (!file.getContent()) {
    self.readFileContent(file, function(err, file) {
      if (err) return cb(err);
      file.deleteTask(task, self.getConfig());
      self.writeAndExtract(file, true, cb);
    });
  } else {
    file.deleteTask(task, self.getConfig());
    self.writeAndExtract(file, true, cb);
  }
};
Repository.prototype.deleteTasks = function(tasks, cb) {
  if (!cb) throw new Error("tasks, callback required");
  var self = this;
  
  let files = _groupBy(tasks, task => task.source.path) // {path:tasks, path2:tasks}
  for (let [path, tasks] of Object.entries(files)) {
    files[path] = fastSort(tasks).by({desc: 'line'})
  }
  async.eachSeries(Object.entries(files), ([path, tasks], cb) => {
    const file = this.getFile(path)
    async.eachSeries(tasks,(task, cb) => {
      task = new Task(this.config, task, true)
      if (!file.getContent()) {
        self.readFileContent(file, (err, file) => {
          if (err) return cb(err);
          file.deleteTask(task, self.getConfig());
          cb(null, task);
        });
      } else {
        file.deleteTask(task, self.getConfig());
        cb(null, task);
      }
    }, (err) => {
      if (err) return cb(err)
      self.writeAndExtract(file, true, cb)
    })
  }, cb)
};

Repository.prototype.modifyTaskFromHtml = function(task, html, cb) {
  cb = tools.cb(cb);
  var file = this.getFileForTask(task);
  if (!file.getContent()) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err);
      file.modifyTaskFromHtml(task, html);
      this.writeAndExtract(file, true, cb);
    });
  } else {
    file.modifyTaskFromHtml(task, html);
    this.writeAndExtract(file, true, cb);
  }
};

Repository.prototype.modifyTaskFromContent = function(task, content, cb) {
  cb = tools.cb(cb);
  var file = this.getFileForTask(task);
  if (!file.getContent()) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err);
      file.modifyTaskFromContent(task, content, this.getConfig());
      this.writeAndExtract(file, true, cb);
    });
  } else {
    file.modifyTaskFromContent(task, content, this.getConfig());
    this.writeAndExtract(file, true, cb);
  }
};

Repository.prototype.addTaskToFile = function(filePath, list, content, order, cb) {
  cb = tools.cb(cb);
  const relPath = this.getRelativePath(filePath)
  let file = this.getFile(relPath)
  const config = this.getConfig()
  const taskSyntax = config.getNewCardSyntax()
  const newLine = config.isMetaNewLine()
  const interpretedTaskPrefix = _template(config.getTaskPrefix())({date: new Date()}).trimEnd()
  const taskPrefix = interpretedTaskPrefix ? `${interpretedTaskPrefix} ` : ''
  const lines = eol.split(content)
  const text = lines[0]
  if (tools.hasBlankLines(content)) {
    lines.splice(1, 0, File.START_TAG)
    lines.push(File.END_TAG)
  }
  const appendTask = (file, cb) => {
    const fileContent = file.getContent()
    const length = fileContent.length
    const crlf = String(eol.crlf)
    let sep = fileContent.indexOf(crlf) > -1 ? crlf : String(eol.lf)
    if (fileContent.endsWith(eol.lf)) sep = ''
    const pre = (length > 0 && !Task.hasCheckPrefix(taskPrefix)) ? sep : ''
    const description = lines.length > 1
      ? File.padDescription(lines.slice(1), taskPrefix).join(eol.lf)
      : '';
    order = (order || order == 0) ? order : ''
    let appendContent
    if (taskSyntax === Task.Types.MARKDOWN) {
      appendContent = `${pre}${taskPrefix}[${text}](#${list}:${order})${eol.lf}${description}` 
    } else if (taskSyntax === Task.Types.HASH_META_ORDER) {
      const task = new Task(this.config, {description: description.split(eol.lf), meta: {}, order, text, beforeText: taskPrefix})
      Task.prototype.updateOrderMeta.apply(task, [this.config, newLine])
      const taskContent = task.description.join(eol.lf)
      appendContent = `${pre}${taskPrefix}#${list} ${text}${eol.lf}${taskContent}`
    } else {
      appendContent = `${pre}${taskPrefix}#${list}:${order} ${text}${eol.lf}${description}`
    }
    file.setContent(`${fileContent}${sep}${appendContent}`)
    this.writeAndExtract(file, true, cb)
  }
  
  if (file) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err)
      appendTask(file, cb)
    })
  } else {
    const modifiedTime = new Date()
    const createdTime = new Date()
    const journalTemplate = _get(config, 'settings.journalTemplate')
    const content = journalTemplate ? journalTemplate + String(eol.lf) : ''
    file = new File({repoId: this.path, filePath: relPath, content, modifiedTime, createdTime})
    appendTask(file, cb)
  }
}

/**
 * Description
 * @method modifyTask
 * @param {} task
 * @return CallExpression
 */
Repository.prototype.modifyTask = function(task, writeFile, cb) {
  if (!Task.isTask(task)) return cb()
  if (_isFunction(writeFile)) {
    cb = writeFile;
    writeFile = false;
  }
  cb = tools.cb(cb);
  log("Modifying Task... text:%s list:%s order:%d path:%s id:%s line:%d", task.text, task.list, task.order, task.source.path, task.id, task.line);
  var self = this;
  let beforeModifyContent
  var file = this.getFileForTask(task);
  try {
    beforeModifyContent = file.getContent()
  } catch (e) {
    console.log(`Can't get file for task: {text:'${task.text}', path:'${task.source.path}', line:${task.line}}`)
  }

  if (!beforeModifyContent) {
    this.readFileContent(file, (err, file) => {
      if (err) return cb(err);
      file.modifyTask(task, self.getConfig(), true);
      file.transformTasks(self.getConfig(), true)
      file.extractTasks(self.getConfig())
      if (writeFile) return this.writeAndAdd(file, cb);
      cb(null, task)
    });
  } else {
    file.modifyTask(task, self.getConfig(), true);
    file.transformTasks(self.getConfig(), true)
    file.extractTasks(self.getConfig())
    if (writeFile && (beforeModifyContent !== file.getContent())) {
      return this.writeAndAdd(file, cb);
    }
    cb(null, task);
  }
};

Repository.prototype.setTaskPriority = function(_task, index, cb) {
  if (_task.order === "") return cb();
   _task.order = index*10;
  cb();
};

Repository.prototype.moveTask = function({task, newList, newPos}, cb) {
  if (!Task.isTask(task)) task = new Task(this.config, task);
  task = this.getTask(task.id)

  if (!newList) newList = task.list
  var toListTasks = this.getTasksInList(newList);
  if (toListTasks === undefined) return cb(new Error(ERRORS.LIST_NOT_FOUND, newList));

  var fromListTasks = this.getTasksInList(task.list);
  if (fromListTasks === undefined) return cb(new Error(ERRORS.LIST_NOT_FOUND, task.list));

  var sameList = (newList == task.list);
  if (!sameList) task.oldList = task.list;
  task.list = newList;

  // Move the task to the correct position in the list
  toListTasks = _reject(toListTasks, function(_task) {
    return  _task.equals(task);
  });
  toListTasks.splice(newPos,0,task);

  if (!sameList) {
    fromListTasks = _reject(fromListTasks, function(_task) {
      return  _task.equals(task);
    });
  }

  // Modify the task order
  const tasksToModify = []
  const tasksBefore = newPos !== 0
  const tasksAfter = newPos < toListTasks.length - 1

  if (tasksAfter && !tasksBefore) {
    task.order = toListTasks[newPos + 1].order - 10
    tasksToModify.push(task)
  } else if (tasksBefore && !tasksAfter) {
    task.order = toListTasks[newPos - 1].order + 10
    tasksToModify.push(task)
  } else if (tasksBefore && tasksAfter) {
    const taskBeforeOrder = toListTasks[newPos - 1].order
    const taskAfterOrder = toListTasks[newPos + 1].order
    
    if (taskBeforeOrder === taskAfterOrder) {
      let closestIndexWithDifferentOrder
      
      const startOfList = toListTasks.slice(0, newPos-1)
      for (let index = startOfList.length - 1; !closestIndexWithDifferentOrder && index > -1; index--) {
        const t = startOfList[index]
        if (t.order !== taskAfterOrder) closestIndexWithDifferentOrder = index
      }
      
      if (closestIndexWithDifferentOrder > -1) {
        const startingOrder = toListTasks[closestIndexWithDifferentOrder].order
        const numTasksWithSameOrder = newPos - closestIndexWithDifferentOrder
        const increment = (taskAfterOrder - startingOrder) / (numTasksWithSameOrder + 1)
        let newOrder = startingOrder + increment
        for (let index = closestIndexWithDifferentOrder + 1; index < newPos + 1; index++) {
          toListTasks[index].order = newOrder
          tasksToModify.push(toListTasks[index])
          newOrder = newOrder + increment
        }
      } else {
        let newOrder = taskAfterOrder - 10
        for (let index = newPos; index > -1; index--) {
          toListTasks[index].order = newOrder
          tasksToModify.push(toListTasks[index])
          newOrder = newOrder - 10
        }
      }
    } else {
      const increment = (taskAfterOrder - taskBeforeOrder) / 2
      task.order = taskBeforeOrder + increment
      tasksToModify.push(task)
    }
  } else {
    tasksToModify.push(task)
  } 
    
  async.eachSeries(fastSort(tasksToModify).by({desc: 'line'}), (task, cb) => {
    this.modifyTask(task, true, cb);
  }, err => {
    if (err) return cb([new Error("moveTasks: Error while modifying tasks in the current list"), err])
    cb(null, task)
  })
};

Repository.prototype.moveTasks = function(tasks, newList, newPos, noEmit, cb) {
  var log = require('debug')('moveTasks');
  var self = this;
  if (this.getList(newList).filter) return cb(new Error(`Tasks can\'t be moved to a filtered list ${newList}.`))
  var listsModified = [newList];
  if (_isFunction(noEmit)) {
    cb = noEmit;
    noEmit = false;
  }
  this.moving = true;
  cb = tools.cb(cb);

  log("Move tasks to list:%s at position:%d : %j", newList, newPos, tasks);
  log("newList before mods:", JSON.stringify(self.getTasksInList(newList), null, 3));


  async.series(tasks.map((task, i) => {
    return function(cb) {
      if (listsModified.indexOf(task.list) < 0) listsModified.push(task.list);
      self.moveTask({task, newList, newPos: newPos+i, noEmit:true}, cb);
    };
  }), function(err) {
    if (err) console.error('Error occurred while moving tasks:', err)
    self.saveModifiedFiles(function(err, results) {
      if (err) console.error('Error occurred while saving modified files:', err)
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
      self.writeAndExtract(file, false, cb);
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
  if (!repo) return []
  var tasks = {};
  var allTasks = noSort ? tasksAry : fastSort(tasksAry).by(DEFAULT_SORT)
  allTasks.forEach(function(task) {
    if (!tasks[task.list]) tasks[task.list] = [];
    tasks[task.list].push(task);
  });
  var lists = _cloneDeep(repo.getLists());
  lists.forEach(function(list) {
    if (list.filter) return repo.populateFilteredList(list, tasksAry)
    list.tasks = tasks[list.name] || [];
  });
  return lists;
}

Repository.prototype.populateFilteredList = function(list, tasks) {
  this.runFilteredListQuery(list, tasks)
};

Repository.prototype.runFilteredListQuery = function(list, tasks) {
  try {
    list.tasks = Repository.query(tasks, list.filter).map(task => {
      const filteredListTask = new Task(this.config, {...task, filteredListName: list.name})
      return filteredListTask
    })
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
  if (!_isString(name)) return [];
  var tasks = _where(this.getTasks(), {list: name});
  if (tasks.length === 0) return [];
  var allTasks = fastSort(_where(tasks, {list:name})).by(DEFAULT_SORT);
  if (_isNumber(offset) && _isNumber(limit)) return allTasks.slice(offset, offset+limit);
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
  const config = new Config(repo.config)
  var newRepo = new Repository(repo.path, config);
  var count = 0;
  repo.files.forEach(file => {
    log("file:%j", file);
    newRepo.addFile(new File({file, config, languages}), function(err) {
      if (err) return cb(err);
      count++;
      log("count:%d, repo.files.length:%d", count, repo.files.length);
      if (count == repo.files.length) cb(null, newRepo);
    });
  });
};

Repository.prototype.getTemplates = function(qry, cb) {
  inMixinsNoop(cb);
};

Repository.regexQuery = function(tasks, queryString) {
  return tasks.filter(task => {
    if (task.rawTask.search(new RegExp(tools.escapeRegExp(queryString),'i')) > -1) return true
    for (let i in task.description) {
      if (task.description[i].search(new RegExp(tools.escapeRegExp(queryString),'i')) > -1) return true
    }
  })
}

Repository.parseSortFromQueryString = function(queryString) {
  const sort = []
  queryString = queryString.replace(/\s([+-])([A-Za-z.]+)/g, (match, order, attr) => {
    const direction = order === '+' ? 'asc' : 'desc'
    const sortString = `{ "${direction}": "function (o) { return o.${attr}; }" }`
    sort.push(JSONfns.parse(sortString))
    return ''
  })
  return {
    sort,
    queryString
  }
}

Repository.parseSortFromMongoQuery = function(mongoQuery) {
  const sort = []
  for (const [key, value] of Object.entries(mongoQuery.sort)) {
    if (value > 0) sort.push({asc: key})
    else sort.push({desc: key})
  }
  return sort
}

Repository.sortByQuery = function(tasks, queryString = '') {
  queryString = tools.replaceDateLanguage(queryString)
  let {sort} = Repository.parseSortFromQueryString(queryString)
  if (!sort || sort.length === 0 ) sort = DEFAULT_SORT
  fastSort(tasks).by(sort)
}

Repository.query = function(tasks, queryString = '') {
  let query
  let sort
  queryString = tools.replaceDateLanguage(queryString)
  const resp = Repository.parseSortFromQueryString(queryString)
  try {
    query = monquery(resp.queryString)
    sort = resp.sort
  } catch (e) {
    log(`Unable to parse ${queryString} using monquery`)
  }
  let result = []
  if (query) result = tasks.filter(sift.default(query))
  if (!query || result.length === 0) {
    result = Repository.regexQuery(tasks, resp.queryString)
    sort = resp.sort
  }
  if (!sort || sort.length === 0 ) sort = DEFAULT_SORT
  fastSort(result).by(sort)
  return result
}

Repository.replaceDatesInQuery = function(query) {
  return Repository.filterObjectValues(query, (key, value) => {
    let date = Date.parse(value)
    if (date && /(\d{4})-(\d{2})-(\d{2})/.test(value)) {
      return date
    }
    return value
  })
}

Repository.filterObjectValues = function(o, cb) {
  if (o && typeof o === 'object') {
    for (const [key, value] of Object.entries(o)) {
      if (value && typeof value === 'object') {
        Repository.filterObjectValues(value, cb)
      } else {
        o[key] = cb(key, value)
      }
    }
  }
  return o
}

Repository.prototype.query = function(queryString) {
  const result = Repository.query(this.getTasks(), queryString)
  return Repository.getTasksByList(this, result, true)
}

function trimFunction (propValue) {
  let func = null
  if (propValue && _isFunction(propValue)) {
    const functionMatch = propValue.toString().match(functionRegex())
    const lines = eol.split(functionMatch[3]);
    const funcBody = lines.filter(line => line.trim().length > 0).join(eol.lf)
    try {
      func = new Function(funcBody)
    } catch (e) {
      console.error(`Unable to parse function:`, propValue.toString())
      console.error(e)
    }
  }
  return func
}

Repository.trimFunctionsInSettings = function (config) {
  const computed = _get(config, 'settings.cards.computed')
  if (_isObject(computed)) {
    Object.keys(computed).forEach(key => {
      const value = computed[key]
      const func = trimFunction(value)
      if (func) config.settings.cards.computed[key] = func
    })
  }

  let links = _get(config, 'settings.cards.links')
  if (Array.isArray(links)) {
    links = links.map(link => {
      ['action', 'display'].forEach(prop => {
        const propValue = link[prop]
        const func = trimFunction(propValue)
        if (func) link[prop] = func
      })
      return link
    })
    config.settings.cards.links = links
  }

  let actions = _get(config, 'settings.actions')
  if (Array.isArray(actions)) {
    actions = actions.map(action => {
      const propValue = action.function
      const func = trimFunction(propValue)
      if (func) action.function = func
      return action
    })
    config.settings.actions = actions
  }
}

module.exports = Repository;
