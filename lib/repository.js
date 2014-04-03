var _                = require('lodash'),
    fs               = require('fs'),
    events           = require('events'),
    util             = require('util'),
    wrench           = require('wrench'),
    async            = require('async'),
    isBinaryFileSync = require('isbinaryfile'),
    chokidar         = require('chokidar'),
    File             = require('./file'),
    List             = require('./list');

var ERRORS                  = { NOT_A_FILE: "file must be of type File",
                                CALLBACK_REQUIRED: "Last paramter must be a callback function" },
    DEFAULT_FILE_PATTERN    = "^(readme\\.md|home\\.md)$",
    DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build)\\/?|\\.(git|svn)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$",
    CONFIG_DIR              = ".imdone",
    CONFIG_FILE             = CONFIG_DIR + "/config.json",
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

function Repository(path) {
  if (!_.isString(path) || !fs.existsSync(path) || !fs.statSync(path).isDirectory())
    throw new Error("Path must be an existing directory on the file system");

  events.EventEmitter.call(this);
  // path is the root path of the repository
  this.path = path;
  this.files = [];
  this.config = this.loadConfig() || {};
  _.defaults(this.config, _.cloneDeep(DEFAULT_CONFIG));

  this.createListeners();
}

util.inherits(Repository, events.EventEmitter);

Repository.prototype.init = function(cb) {
  var self = this;
  if (!_.isFunction(cb)) cb = _.noop;
  
  this.readFiles(function(err, files) {
    if (self.config.watcher) self.initWatcher();
    cb(err,files);
  });
};

Repository.prototype.getId = function() {
  return this.getPath();
};

Repository.prototype.createListeners = function() {
  var self = this;
  this.taskFoundListener = function(task) {
    if (!_.find(self.config.lists, {name:task.list})) {
      var list = new List(task.getList()).toJSON();
      self.config.lists.push(list);
      self.emit('list.found', list);
      self.saveConfig();
    }
    self.emit('task.found', {repo:self, task:task});
  };
};

Repository.prototype.initWatcher = function() {
  var self = this;
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
    console.log("Watcher received add event for file: " + path);
    var relPath = self.getRelativePath(path);
    var file = self.getFile(relPath);
    if (file === undefined) {
      file = new File(self.getId(), relPath);
    } else if (fs.statSync(path).mtime <= file.getModifiedTime()) return;
    
    if (self.fileOK(file)) {
      console.log("Reading file: " + path);
      self.readFile(file);
    }
  })
  .on('addDir', function(path) {console.log('Directory', path, 'has been added');})
  .on('change', function(path) {
    console.log("Watcher received change event for file: " + path);
    var file = self.getFile(self.getRelativePath(path));
    if (self.fileOK(file)) {
      console.log("Reading file: " + path);
      self.readFile(file);
    }
  })
  .on('unlink', function(path) {
    console.log("Watcher received unlink event for file: " + path);
    var file = new File(self.getId(), self.getRelativePath(path));
    console.log("Removing file: " + path);
    self.removeFile(file);
  })
  .on('unlinkDir', function(path) {console.log('Directory', path, 'has been removed');})
  .on('error', function(error) {console.error('Error happened', error);});

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

// TODO: Use async file operations
Repository.prototype.saveConfig = function() {
  var dir = this.getFullPath(CONFIG_DIR);
  var file = this.getFullPath(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  var config = JSON.stringify(this.getConfig(), null, 2);
  fs.writeFileSync(file, config);
};

Repository.prototype.loadConfig = function() {
  var file = this.getFullPath(CONFIG_FILE);
  if (fs.existsSync(file)) this.config = JSON.parse(fs.readFileSync(file));
  return this.config;
};

Repository.prototype.setExcludePatterns = function(patterns) {
  this.config.excludePatterns = patterns;
};

Repository.prototype.getFullPath = function(file) {
  if (File.isFile(file)) file = file.path;
  return this.path + "/" + file;
};

Repository.prototype.getRelativePath = function(path) {
  return path.replace(this.path + "/", "");
};

Repository.prototype.fileOK = function(file) {
  if (!File.isFile(file) || 
      /\.\.\//.test(file.path) ||
      !fs.lstatSync(this.getFullPath(file)).isFile() ||
      isBinaryFileSync(this.getFullPath(file))) return false;

  return !this.shouldExclude(file.path);
};

Repository.prototype.shouldExclude = function(relPath) {
  var ok = false;
  _.each(this.config.exclude, function(pattern) {
    if ((new RegExp(pattern)).test(relPath)) {
      ok = true;
      return false;
    }
  });
  return ok;
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
    this.emit("file.update", file);
  }
  
  return this.files;
};

// remove a file from the files refrence array
Repository.prototype.removeFile = function(file) {
  if (!File.isFile(file)) throw new Error(NOT_A_FILE);
  this.files = _.reject(this.files, {path:file.path});
  return this.files;
};

Repository.prototype.getFile = function(path) {
  return _.find(this.files, {path:path});
};

Repository.prototype.getFiles = function(paths) {
  if (_.isUndefined(paths)) return this.files;
  return _.find(this.files, function(file) {
    return (_.indexOf(paths, file.path) > -1);
  });
};

Repository.prototype.extractTasks = function(file) {
  var self = this;
  file.on('task.found', this.taskFoundListener);
  file.extractTasks();
  file.removeListener('task.found', this.taskFoundListener);
};

Repository.prototype.writeFile = function(file, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  if (!File.isFile(file)) return cb(new Error(NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.\//.test(file.path)) {
    fs.writeFile(filePath, file.content, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to write file:" + file.path));
      file.setModifiedTime(fs.statSync(filePath).mtime);
      self.extractTasks(file);
      self.addFile(file);
      cb(null, file);
    });
  } else return cb(new Error("Unable to write file:" + file.path));
};

Repository.prototype.getFilesInPath = function() {
  var self = this;
  var allPaths = wrench.readdirSyncRecursive(this.path);
  var paths = _.filter(allPaths, function(path) {
    return self.fileOK(new File(self.getId(), path));
  });

  return _.map(paths, function(path) { return new File(self.getId(), path); });
};

Repository.prototype.readFile = function(file, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.\//.test(file.path)) {
    fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to read file:" + file.path));
      file.setContent(data).setModifiedTime(fs.statSync(filePath).mtime);
      self.extractTasks(file);
      self.addFile(file);
      cb(null, file);
    });
  } else return cb(new Error("Unable to read file:" + file.path));
};

Repository.prototype.readFiles = function(files, cb) {
  var args = arguments;
  var al = args.length;
  if (al === 0) { cb = _noop; files = undefined; }
  else if (al === 1) {
    if (_.isFunction(args[0])) { cb = args[0]; files = undefined; }
    else if (_.isArray(args[0])) { cb = _.noop; }
    else { throw new Error("Single argument must be an array of files or callback"); }
  } else {
    if (!_.isArray(files)) throw new Error("files must be an array of files");
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
  if (!_.isFunction(cb)) cb = _.noop;
  var file = this.getFile(path);
  if (!_.isUndefined(file)) {
    var self = this;
    fs.unlink(this.getFullPath(file), function (err) {
      if (err) return cb("Unable to delete:" + path + " : " + err.toString());
      self.removeFile(file);
      self.emit("file.deleted", file);
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

Repository.prototype.modifyTask = function(task) {
  var path = task.getSource().path;
  var file = _.find(this.getFiles(), {path:path});
  if (!_.undefined(file)) {
    task = file.modifyTask(task);
    this.emit('task.modified', task);
    this.emit('file.modified', file);
  }

  return task;
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

module.exports = Repository;