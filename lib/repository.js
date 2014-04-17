var _                = require('lodash'),
    fs               = require('fs'),
    events           = require('events'),
    util             = require('util'),
    wrench           = require('wrench'),
    async            = require('async'),
    isBinaryFileSync = require('isbinaryfile'),
    chokidar         = require('chokidar'),
    path             = require('path'),
    File             = require('./file'),
    tools            = require('./tools'),
    log             = require('debug')('Repository'),
    List             = require('./list');

var ERRORS                  = { NOT_A_FILE: "file must be of type File",
                                CALLBACK_REQUIRED: "Last paramter must be a callback function" },
    DEFAULT_FILE_PATTERN    = "^(readme\\.md|home\\.md)$",
    DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build)\\/?|\\.(git|svn)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$",
    CONFIG_DIR              = ".imdone",
    CONFIG_FILE             = path.join(CONFIG_DIR,"config.json"),
    DEFAULT_CONFIG          = { exclude: [DEFAULT_EXCLUDE_PATTERN],
                                watcher: true,
                                lists: [],
                                marked : { 
                                  gfm: true,
                                  tables: true,
                                  breaks: false,
                                  pedantic: false,
                                  sanitize: true,
                                  smartLists: true,
                                  langPrefix: 'language-' }
                              };

// Emits task.found, list.found, file.update and file.delete
function Repository(path, config) {
  if (!_.isString(path) || !fs.existsSync(path) || !fs.statSync(path).isDirectory())
    throw new Error("Path must be an existing directory on the file system");

  events.EventEmitter.call(this);
  // path is the root path of the repository
  this.path = path;
  this.files = [];
  this.config = this.loadConfig() || config || {};
  _.defaults(this.config, _.cloneDeep(DEFAULT_CONFIG));

  this.createListeners();
}

util.inherits(Repository, events.EventEmitter);

Repository.prototype.init = function(cb) {
  var self = this;
  cb = tools.cb(cb);
  
  this.readFiles(function(err, files) {
    if (self.config.watcher) self.initWatcher();
    cb(err,files);
  });
};

Repository.prototype.destroy = function() {
  if (this.watcher) this.watcher.close();
  this.path = null;
  this.files = null;
  this.config = null;
  this.removeAllListeners();
};

Repository.prototype.getId = function() {
  return this.getPath();
};

Repository.prototype.createListeners = function() {
  var self = this;
  this.taskFoundListener = function(task) {
    if (!self.listExists(task.list)) {
      var list = _.pick(new List(task.getList()), "name", "hidden");
      list = new List(list.name, list.hidden);
      self.config.lists.push(list);
      self.emit('list.found', list);
      self.saveConfig();
    }
    self.emit('task.found', task);
  };
};

Repository.prototype.initWatcher = function() {
  var self = this;
  log("Creating a new watcher");
  this.watcher = chokidar.watch(self.path, {
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

Repository.prototype.getPath = function() {
  return this.path;
};

Repository.prototype.getConfig = function() {
  return this.config;
};

Repository.prototype.getLists = function() {
  return this.getConfig().lists;
};

Repository.prototype.setLists = function(lists) {
  this.config.lists = lists;
  return this;
};

Repository.prototype.listExists = function(name) {
  return (_.findIndex(this.getLists(), { name: name }) > -1);
};

Repository.prototype.saveConfig = function(cb) {
  cb = tools.cb(cb);
  var self = this;
  var dir = this.getFullPath(CONFIG_DIR);
  var file = this.getFullPath(CONFIG_FILE);
  fs.exists(dir, function(exists) {
    var config = _.cloneDeep(self.getConfig(), function(val) { 
      return val.tasks ? {name: val.name, hidden: val.hidden} : undefined;
    });

    var json = JSON.stringify(self.getConfig(), null, 2);
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

Repository.prototype.loadConfig = function() {
  var file = this.getFullPath(CONFIG_FILE);
  if (fs.existsSync(file)) {
    this.config = JSON.parse(fs.readFileSync(file));
  }
  return this.config;
};

Repository.prototype.setExcludePatterns = function(patterns) {
  this.config.excludePatterns = patterns;
};

Repository.prototype.getFullPath = function(file) {
  if (File.isFile(file)) file = file.path;
  return path.join(this.path,file);
};

Repository.prototype.getRelativePath = function(fullPath) {
  return path.relative(this.path, fullPath);
};

Repository.prototype.fileOK = function(file, includeDirs) {
  if (File.isFile(file)) file = file.path;
  var stat = fs.lstatSync(this.getFullPath(file));
  if ( /\.\.(\/|\\)/.test(file) ||
      (!includeDirs && !stat.isFile()) ||
      (stat.isFile() && isBinaryFileSync(this.getFullPath(file))) ) return false;

  return this.shouldExclude(file) ? undefined : stat;
};

Repository.prototype.shouldExclude = function(relPath) {
  var exclude = false;
  _.each(this.config.exclude, function(pattern) {
    if ((new RegExp(pattern)).test(relPath)) {
      exclude = true;
      return false;
    }
  });
  // log("Should we exclude:%s exclude:%s", relPath, exclude);

  return exclude;
};

// Add or replace a file in the files reference array
Repository.prototype.addFile = function(file) {
  if (this.fileOK(file)) {
    var index = _.findIndex(this.files, {path:file.path});
    if (index > -1) {
      this.files[index] = file;
    } else {
      this.files.push(file);
    }
  }
  
  return this.files;
};

// remove a file from the files refrence array
Repository.prototype.removeFile = function(file) {
  if (!File.isFile(file)) throw new Error(NOT_A_FILE);
  this.files = _.reject(this.files, {path:file.path});
  this.emit("file.delete", file);

  return this.files;
};

Repository.prototype.getFile = function(path) {
  return _.find(this.files, {path:path});
};

Repository.prototype.getFileForTask = function(task) {
  return this.getFile(task.getSource().path);
};

Repository.prototype.getFiles = function(paths) {
  if (_.isUndefined(paths)) return _.sortBy(this.files, "path");
  return _.filter(this.files, function(file) {
    return (_.indexOf(paths, file.path) > -1);
  });
};

Repository.prototype.extractTasks = function(file) {
  var self = this;
  file.on('task.found', this.taskFoundListener);
  file.extractTasks();
  file.content = null;
  file.removeListener('task.found', this.taskFoundListener);
};

Repository.prototype.writeFile = function(file, cb) {
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.(\/|\\)/.test(file.path)) {
    //log("file:%s", JSON.stringify(file, null, 5));
    fs.writeFile(filePath, file.content, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to write file:" + file.path), file);
      file.setModifiedTime(fs.statSync(filePath).mtime);
      file.modified = false;
      self.extractTasks(file);
      self.addFile(file);
      self.emit("file.update", file);

      cb(null, file);
    });
  } else return cb(new Error("Unable to write file:" + file.path), file);
};

Repository.prototype.getFilesInPath = function(includeDirs) {
  var self = this;
  var allPaths = wrench.readdirSyncRecursive(this.path);
  var files = [];
  _.each(allPaths, function(path) {
    var stat = self.fileOK(path, includeDirs);
    if (stat) {
      var file = new File(self.getId(), path);
      file.isDir = stat.isDirectory();
      files.push(file);
    }
  });

  return _.sortBy(files, "path");
};

Repository.prototype.readFileContent = function(file, cb) {
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  fs.readFile(filePath, 'utf8', function(err, data) {
    if (err) return cb(new Error("Unable to read file:" + file.path));
    file.setContent(data).setModifiedTime(fs.statSync(filePath).mtime);
    cb(null, file);
  });
};

Repository.prototype.readFileContentSync = function(file) {
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  file.setContent(fs.readFileSync(filePath, 'utf8'))
      .setModifiedTime(fs.statSync(filePath).mtime);

  return file;
};

Repository.prototype.readFile = function(file, cb) {
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;

  if (!/\.\.(\/|\\)/.test(file.path)) {
    this.readFileContent(file, function(err, file) {
      if (err) return cb(new Error("Unable to read file:" + file.path));
      self.extractTasks(file);
      self.addFile(file);
      cb(null, file);
    });
  } else return cb(new Error("Unable to read file:" + file.path));
};

Repository.prototype.readFiles = function(files, cb) {
  if (arguments.length === 0) cb = _noop, files = undefined;
  else if (_.isFunction(files)) cb = files, files = undefined;
  else {
    if (files && !_.isArray(files)) throw new Error("files must be an array of files or undefined");
    if (!_.isFunction(cb)) throw new Error("callback must be a function");
  }

  if (files === undefined) {
    if (this.files && this.files.length > 0) { files = this.files; }
    else { files = this.getFilesInPath(); this.files = files; }
  }

  var self = this;
  var funcs = _.map(files, function(file) {
    return function(cb) { self.readFile(file, cb); };
  });

  if (funcs.length > 0) async.parallel(funcs, cb);
  else cb();
};

Repository.prototype.deleteFile = function(path, cb) {
  cb = tools.cb(cb);
  var file = this.getFile(path);
  if (!_.isUndefined(file)) {
    var self = this;
    fs.unlink(this.getFullPath(file), function (err) {
      if (err) return cb("Unable to delete:" + path + " : " + err.toString());
      self.removeFile(file);
      cb(null, file);
    });
  } else cb("Unable to delete:" + path);
};

Repository.prototype.hasDefaultFile = function() {
  return _.some(this.getFiles(), function(file) {
    var regex = new RegExp(DEFAULT_FILE_PATTERN, "i");
    return regex.test(file.path);
  });
};

Repository.prototype.getDefaultFile = function() {
  var files = _.sortBy(this.getFiles(), function(file) { return file.path; });
  var file = _.find(files.reverse(), function(file) {
    var regex = new RegExp(DEFAULT_FILE_PATTERN, "i");
    return regex.test(file.path);
  });
  return file;
};

Repository.prototype.moveList = function(name, pos, cb) {
  cb = tools.cb(cb);
  var lists = this.getLists();
  var list = _.find(lists, {name:name});
  // Only modify the lists if the list name exists
  if (list) {
    lists = _.remove(this.getLists(), {name:name});
    lists.splice(pos, 0, list);
    this.setLists(lists);
    this.saveConfig(cb);
  } else cb();
};

// DONE:0 Test renameList
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
  _.each(tasksToModify, function(task) {
    var file = self.getFileForTask(task);
    if (!_.find(files, {path: file.getPath()})) {
      self.readFileContentSync(file);
      files.push(file);
    }
    task.list = newName;
    file.modifyTask(task);
  });

  // Write the files
  var funcs = _.map(files, function(file) {
    return function(cb) {
      self.writeFile(file, cb);
    };
  });

  if (funcs.length > 0) {
    async.parallel(funcs, cb);
  } else cb();
};

// DOING: modifyTask must be async.  Get file content before proceeding.
Repository.prototype.modifyTask = function(task) {
  var file = this.getFileForTask(task);
  if (!file.isModified()) this.readFileContentSync(file);
  log("file:%s", file.path);
  log("content:%s", file.content);
  return file.modifyTask(task);
};

Repository.prototype.getTasks = function() {
  var tasks = [],
      self = this;
  _.each(this.getFiles(), function(file) {
    _.each(file.getTasks(), function(task) {
      tasks.push(task);
    });
  });

  return tasks;
};

Repository.prototype.getTasksInList = function(name) {
  var tasks = this.getTasks();
  return (tasks.length > 0) ? _.where(this.getTasks(), {list:name}) : [];
};

module.exports = Repository;