'use strict';

var _                = require('lodash'),
    fs               = require('fs'),
    events           = require('events'),
    util             = require('util'),
    async            = require('async'),
    path             = require('path'),
    marked           = require('marked'),
    isBinaryFileSync = require('isbinaryfile'),
    File             = require('./file'),
    Config           = require('./config'),
    tools            = require('./tools'),
    log              = require('debug')('imdone-core:Repository'),
    List             = require('./list');

var ERRORS                  = { NOT_A_FILE: "file must be of type File",
                                CALLBACK_REQUIRED: "Last paramter must be a callback function" },
    DEFAULT_FILE_PATTERN    = "^(readme\\.md|home\\.md)$",
    DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build)[\\/\\\\]?|\\.(git|svn|hg|npmignore)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$",
    CONFIG_DIR              = ".imdone",
    CONFIG_FILE             = path.join(CONFIG_DIR,"config.json"),
    DEFAULT_CONFIG          = { exclude: [DEFAULT_EXCLUDE_PATTERN],
                                watcher: true,
                                code: {
                                  include_lists:["TODO", "DOING", "DONE", "PLANNING", "FIXME", "ARCHIVE"]
                                },
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
function Repository(path, config) {
  if (!_.isString(path) || !fs.existsSync(path) || !fs.statSync(path).isDirectory())
    throw new Error("Path must be an existing directory on the file system");

  events.EventEmitter.call(this);
  // path is the root path of the repository
  this.path = path;
  this.files = [];
  this.config = this.loadConfig() || config || {};
  this.config = new Config(this.config);
  this.plugins = {};
  _.defaults(this.config, _.cloneDeep(DEFAULT_CONFIG));

  this.initPlugins();
  this.createListeners();
}

Repository.fs = function(_fs) {
  fs = _fs;
};

Repository.isBinaryFileSync = function(_binCheck) {
  isBinaryFileSync = _binCheck;
};

util.inherits(Repository, events.EventEmitter);

/**
 * Description
 * @method init
 * @param {} cb
 * @return 
 */
Repository.prototype.init = function(cb) {
  var self = this;
  cb = tools.cb(cb);
  
  marked.setOptions(this.config.marked);

  this.readFiles(cb);
};

/**
 * Description
 * @method destroy
 * @return 
 */
Repository.prototype.destroy = function() {
  this.path = null;
  this.files = null;
  this.config = null;
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
Repository.prototype.addList = function(list) {
  list = _.omit(list, "tasks");
  this.config.lists.push(new List(list.name, list.hidden));
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

// [Make sure lists are not saved on load in alphabetical order](#archive:50)
/**
 * Save the config file
 *
 * @method saveConfig
 * @param {} cb
 * @return 
 */
Repository.prototype.saveConfig = function(cb) {
  cb = tools.cb(cb);
  var self = this;
  var dir = this.getFullPath(CONFIG_DIR);
  var file = this.getFullPath(CONFIG_FILE);
  fs.exists(dir, function(exists) {
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

/**
 * Load the config file
 *
 * @method loadConfig
 * @return MemberExpression
 */
Repository.prototype.loadConfig = function() {
  var file = this.getFullPath(CONFIG_FILE);
  if (fs.existsSync(file)) {
    var configLikeContent = fs.readFileSync(file);
    try {
      var configLike = JSON.parse(configLikeContent.toString());
      this.config = new Config(configLike);
    } catch (e) {
      return undefined;
    }
  }
  return this.config;
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
  return path.join(this.path,file);
};

/**
 * Get the relative path from repository root
 *
 * @method getRelativePath
 * @param {} fullPath
 * @return String
 */
Repository.prototype.getRelativePath = function(fullPath) {
  return path.relative(this.path, fullPath);
};

/**
 * Is this file OK?
 *
 * @method fileOK
 * @param {} file
 * @param {} includeDirs
 * @return stat
 */
Repository.prototype.fileOK = function(file, includeDirs) {
  if (File.isFile(file)) file = file.path;
  if (this.shouldExclude(file)) return false;
  var stat = false;
  try {
    stat = fs.lstatSync(this.getFullPath(file));
    if ( /\.\.(\/|\\)/.test(file) ||
        (!includeDirs && !stat.isFile()) ||
        (stat.isFile() && isBinaryFileSync(this.getFullPath(file))) ) stat = false;
  } catch (e) {
    stat = false;
  }

  return stat;
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
  // log("Should we exclude:%s exclude:%s", relPath, exclude);

  return exclude;
};

/**
 * Add or replace a file in the files reference array
 *
 * @method addFile
 * @param {} file
 * @return MemberExpression
 */
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
  this.emit("file.delete", file);

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
 * Description
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
Repository.prototype.extractTasks = function(file) {
  file.on('task.found', this.taskFoundListener);
  if (file.content === null) this.readFileContentSync(file);
  file.extractTasks(this.getConfig());
  file.content = null;
  file.removeListener('task.found', this.taskFoundListener);
};

/**
 * Description
 * @method writeFile
 * @param {} file
 * @param {} cb
 * @return 
 */
Repository.prototype.writeFile = function(file, cb) {
  cb = tools.cb(cb);
  if (!File.isFile(file)) return cb(new Error(ERRORS.NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.(\/|\\)/.test(file.path)) {
    // If dir does not exist create it
    var dirName = path.dirname(filePath);
    if (!fs.existsSync(dirName)) tools.mkdirSyncRecursive(fs, dirName);
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

/**
 * Description
 * @method getFilesInPath
 * @param {} includeDirs
 * @return CallExpression
 */
Repository.prototype.getFilesInPath = function(includeDirs) {
  var self = this;
  var allPaths = tools.readdirSyncRecursive(fs, this.path);
  var files = [];
  _.each(allPaths, function(path, processed) {
    if (files.length > 10000) throw new Error('Too many files in path');
    var stat = self.fileOK(path, includeDirs);
    self.emit("file.processed", {file:path, ok:(stat !== false), total:allPaths.length, 
                                 processed:processed+1, repoId:self.getId()});

    if (stat) {
      var file = new File(self.getId(), path);
      file.isDir = stat.isDirectory();
      files.push(file);
    }
  });

  return _.sortBy(files, "path");
};

/**
 * Description
 * @method getFileTree
 * @param {} _path
 * @return out
 */
Repository.prototype.getFileTree = function(_path) {
  var self = this,
      out = {};

  if (!_path) _path = this.path;
  
  log("Path:", _path);
  var files =  fs.readdirSync(_path);
  log("raw files:", files);
  files = _.filter(_.map(files, function(file) { return path.join(_path, file); } ),
            function(file) {
              return self.fileOK(self.getRelativePath(file), true);
            }
          ).sort();

  log("ok files:", files);

  _.each(files, function(file) {
    log(file);
    var name = path.basename(file);
    var relPath = self.getRelativePath(file);
    if (fs.statSync(file).isDirectory()) {
      if(!out.dirs) out.dirs = [];
      out.dirs.push(_.extend({name:name,path:relPath},self.getFileTree(file)));
    } else {
      if(!out.files) out.files = [];
      out.files.push({name:name,path:relPath});
    }
  });
  return out;
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
 * Description
 * @method readFileContent
 * @param {} file
 * @param {} cb
 * @return 
 */
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

/**
 * Description
 * @method readFileContentSync
 * @param {} file
 * @return file
 */
Repository.prototype.readFileContentSync = function(file) {
  var self = this;
  var filePath = this.getFullPath(file);

  file.setContent(fs.readFileSync(filePath, 'utf8'))
      .setModifiedTime(fs.statSync(filePath).mtime);

  return file;
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
      if (err) return cb(new Error("Unable to read file:" + file.path));
      self.extractTasks(file);
      self.addFile(file);
      cb(null, file);
    });
  } else return cb(new Error("Unable to read file:" + file.path));
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
    return function(cb) { 
      self.readFile(file, cb); 
    };
  });

  if (funcs.length > 0) async.parallel(funcs, cb);
  else cb();
};

/**
 * Description
 * @method deleteFile
 * @param {} path
 * @param {} cb
 * @return 
 */
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

/**
 * Description
 * @method moveList
 * @param {} name
 * @param {} pos
 * @param {} cb
 * @return 
 */
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

// [Test renameList](#archive:130)
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
  _.each(tasksToModify, function(task) {
    var file = self.getFileForTask(task);
    if (!_.find(files, {path: file.getPath()})) {
      self.readFileContentSync(file);
      files.push(file);
    }
    task.list = newName;
    file.modifyTask(task, self.getConfig());
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

// [modifyTask must be async.  Get file content before proceeding.](#archive:20)
/**
 * Description
 * @method modifyTask
 * @param {} task
 * @return CallExpression
 */
Repository.prototype.modifyTask = function(task) {
  var file = this.getFileForTask(task);
  if (!file.isModified()) this.readFileContentSync(file);
  log("file:%s", file.path);
  log("content:%s", file.content);
  return file.modifyTask(task, this.getConfig());
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
    _.each(file.getTasks(), function(task) {
      tasks.push(task);
    });
  });

  return tasks;
};

/**
 * Description
 * @method getTasksInList
 * @param {} name
 * @return ConditionalExpression
 */
Repository.prototype.getTasksInList = function(name) {
  var tasks = this.getTasks();
  return (tasks.length > 0) ? _.where(this.getTasks(), {list:name}) : [];
};

Repository.prototype.serialize = function() {
  return JSON.stringify(this, null, 3);
};

Repository.deserialize = function(repo, cb) {
  repo = JSON.parse(repo);
  var newRepo = new Repository(repo.path, repo.config);
  _.each(repo.files, function(file) {
    newRepo.addFile(new File(file));
  });
  newRepo.readFiles(function() {
    cb(newRepo);
  });
};

module.exports = Repository;
