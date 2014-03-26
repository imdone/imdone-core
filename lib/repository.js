var _                = require("lodash"),
    fs               = require('fs'),
    events           = require('events'),
    util             = require('util'),
    wrench           = require('wrench'),
    isBinaryFileSync = require("isbinaryfile"),
    chokidar         = require('chokidar'),
    File             = require("./file");

var errors = {
  NOT_A_FILE: "file must be of type File",
  CALLBACK_REQUIRED: "Last paramter must be a callback function"
};

var defaultFilePattern    = "^(readme\\.md|home\\.md)$";
var defaultExcludePattern = "^(node_modules|bower_components|\\.imdone|target|build)\\/?|\\.(git|svn)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$";
var configDir             = ".imdone";
var configFile            = configDir + "/config.json";
var listsFile             = configDir + "/data.js";
var defaultConfig         = {
  exclude: [defaultExcludePattern],
  watcher: true,
  marked : {
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    langPrefix: 'language-',
  }
};

// DONE:0 Implement a Repository and RepositoryDecorator [JavaScript design patterns – Part 2: Adapter, decorator, and factory | Adobe Developer Connection](http://www.adobe.com/devnet/html5/articles/javascript-design-patterns-pt2-adapter-decorator-factory.html)
function Repository(path, config) {
  if (!_.isString(path) || !fs.existsSync(path) || !fs.statSync(path).isDirectory())
    throw new Error("Path must be an existing directory on the file system");

  events.EventEmitter.call(this);
  // path is the root path of the repository
  this.path = path;
  this.config = config || {};

  _.defaults(this.config, defaultConfig);
}

util.inherits(Repository, events.EventEmitter);

Repository.prototype.init = function(cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  
  this.files = [];
  var self = this;
  var allPaths = wrench.readdirSyncRecursive(this.path);
  var paths = _.filter(allPaths, function(path) {
    return self.fileOK(new File(path));
  });

  var files = _.map(paths, function(path) { return new File(path); });

/* 
var Repository = require('./repository');
var repo = new Repository('/home/jesse/projects/imdone-core/test/files');
repo.init();
*/

  this.readFiles(files, function(err, files) {

    if (self.config.watcher) {
      self.watcher = chokidar.watch(self.path, {
        ignored: function(path) {
          var relPath = self.getRelativePath(path);
          var exclude = self.shouldExclude(relPath);
          return exclude;
        }, 
        persistent: true
      });
      
      self.watcher
      .on('add', function(path) {
        console.log("Watcher received add event for file: " + path);
        var relPath = self.getRelativePath(path);
        var file = self.getFile(relPath);
        if (file === undefined) {
          file = new File(relPath);
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
        var file = new File(self.getRelativePath(path));
        console.log("Removing file: " + path);
        self.removeFile(file);
      })
      .on('unlinkDir', function(path) {console.log('Directory', path, 'has been removed');})
      .on('error', function(error) {console.error('Error happened', error);});
    }

    cb(err,files);

  });
};

Repository.prototype.getPath = function() {
  return this.path;
};

Repository.prototype.getConfig = function() {
  return this.config;
};

Repository.prototype.saveConfig = function() {
  var dir = this.getFullPath(configDir);
  var file = this.getFullPath(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFileSync(file, JSON.stringify(this.getConfig(), null, 2));
};

Repository.prototype.loadConfig = function() {
  var dir = this.getFullPath(configDir);
  var file = this.getFullPath(configFile);
  if (fs.existsSync(file)) 
    this.config = JSON.parse(fs.readFileSync(file));
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
    var index = _.findIndex(this.files, file.path);
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

Repository.prototype.writeFile = function(file, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  if (!File.isFile(file)) return cb(new Error(NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.\//.test(file.path)) {
    fs.writeFile(filePath, file.content, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to write file:" + file.path));
      file.setModifiedTime(fs.statSync(filePath).mtime);
      file.extractTasks();
      self.addFile(file);
      cb(null, file);
    });
  } else return cb(new Error("Unable to write file:" + file.path));
};

Repository.prototype.writeFiles = function(files, cb) {
  if (arguments.length < 2 || _.isUndefined(arguments[1])) {
    if (_.isFunction(arguments[0])) {
      cb = arguments[0];
    } else if (_.isArray(arguments[0])) {
      cb = _.noop;
    } else throw new Error("files must be an array");
  }

  var error;
  _.each(files, function(file, index) {
    self.writeFile(file, function(err, file) {
      if (err) error = err;
      if (index == (files.length - 1)) cb(error, files);
    });
  });
};

Repository.prototype.readFile = function(file, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  if (!File.isFile(file)) return cb(new Error(errors.NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.\//.test(file.path)) {
    fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to read file:" + file.path));
      file.setContent(data).setModifiedTime(fs.statSync(filePath).mtime);
      var tasks = file.extractTasks();
      self.addFile(file);
      cb(null, tasks);
    });
  } else return cb(new Error("Unable to read file:" + file.path));
};

Repository.prototype.readFiles = function(files, cb) {
  if (arguments.length < 2 || _.isUndefined(arguments[1])) {
    if (_.isFunction(arguments[0])) {
      cb = arguments[0];
    } else if (_.isArray(arguments[0])) {
      cb = _.noop;
    } else throw new Error("files must be an array");
  }
  var self = this, error;
  _.each(files, function(file, index) {
    self.readFile(file, function(err, file) {
      if (!_.isUndefined(error)) return;
      if (err) error = err;
      if (index == (files.length - 1)) cb(error, files);
    });
  });
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
    var regex = new RegExp(defaultFilePattern, "i");
    return regex.test(file.path);
  });
};

Repository.prototype.getDefaultFile = function() {
  var files = _.sortBy(this.getFiles(), function(file) { return file.path; });
  var file = _.find(files.reverse(), function(file) {
    var regex = new RegExp(defaultFilePattern, "i");
    return regex.test(file.path);
  });
  return file;
};

Repository.prototype.modifyTask = function(task) {

};

Repository.prototype.modifyListName = function(oldName, newName) {

};

module.exports = Repository;