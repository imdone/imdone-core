var _                = require("lodash"),
    fs               = require('fs'),
    events           = require('events'),
    util             = require('util'),
    wrench           = require('wrench'),
    isBinaryFileSync = require("isbinaryfile"),
    File             = require("./file");

var errors = {
  NOT_A_FILE: "file must be of type File",
  CALLBACK_REQUIRED: "Last paramter must be a callback function"
};

// DOING: Implement a Repository and RepositoryDecorator [JavaScript design patterns – Part 2: Adapter, decorator, and factory | Adobe Developer Connection](http://www.adobe.com/devnet/html5/articles/javascript-design-patterns-pt2-adapter-decorator-factory.html)
function Repository(id) {
  events.EventEmitter.call(this);
  // id is the root path of the repository
  this.id = id;
  this.files = [];
  this.exludePatterns = ["^(node_modules|bower_components|\\.imdone|target|build)\\/|\\.(git|svn)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$"];
}

util.inherits(Repository, events.EventEmitter);

Repository.prototype.getId = function() {
  return this.id;
};

Repository.prototype.init = function(cb) {
  var self = this;
  var paths = wrench.readdirSyncRecursive(this.id);
  paths = _.filter(paths, function(path) {
    return self.fileOK(new File(path));
  });

  var files = _.map(paths, function(id) { return new File(id); });

  this.readFiles(files, cb);
};

Repository.prototype.setExcludePatterns = function(patterns) {
  this.exludePatterns = patterns;
};

Repository.prototype.getFullPath = function(file) {
  return this.id + "/" + file.id;
};

Repository.prototype.fileOK = function(file) {
  if (!File.isFile(file) || 
      /\.\.\//.test(file.id) ||
      !fs.lstatSync(this.getFullPath(file)).isFile() ||
      isBinaryFileSync(this.getFullPath(file))) return false;

  var ok = true;
  _.each(this.exludePatterns, function(pattern) {
    if ((new RegExp(pattern)).test(file.id)) {
      ok = false;
      return false;
    }
  });
  return ok;
};

// Add or replace a file in the files reference array
Repository.prototype.addFile = function(file) {
  if (this.fileOK(file)) {
    var index = _.findIndex(this.files, file.id);
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
  this.files = _.reject(this.files, {id:file.id});
  return this.files;
};

Repository.prototype.getFile = function(id) {
  return _.find(this.files, {id:id});
};

Repository.prototype.getFiles = function(ids) {
  if (_.isUndefined(ids)) return this.files;
  return _.find(this.files, function(file) {
    return (_.indexOf(ids, file.id) > -1);
  });
};

// Look for tasks in a single file, an array of files or the whole repository if undefined
/*
Repository.prototype.extractTasks = function(files) {
  if (File.isFile(files)) {
    files.extractTasks();
    return files;
  } else if (_.isUndefined(files)) {
    files = this.files;
  }
  _.each(files, function(file) {
    file.extractTasks();
  });
  return files;
};
*/

Repository.prototype.writeFile = function(file, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  if (!File.isFile(file)) return cb(new Error(NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.\//.test(file.id)) {
    fs.writeFile(filePath, file.content, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to write file:" + file.id));
      file.extractTasks();
      self.addFile(file);
      cb(null, file);
    });
  } else return cb(new Error("Unable to write file:" + file.id));
};

Repository.prototype.writeFiles = function(files, cb) {
  if (arguments.length < 2 || _.isUndefined(arguments[1])) {
    if (_.isFunction(arguments[0])) {
      cb = arguments[0];
    } else if (_.isArray(arguments[0])) {
      cb = _.noop;
    } else throw new Error("files must be an array");
  }

  _.each(files, function(file, index) {
    self.writeFile(file, function(err, file) {
      if (err) {
        cb(err);
        // TODO: This won't exit the loop
        return false;
      }
      if (index == (files.length - 1)) cb(null, files);
    });
  });
};

Repository.prototype.readFile = function(file, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  if (!File.isFile(file)) return cb(new Error(errors.NOT_A_FILE));
  var self = this;
  var filePath = this.getFullPath(file);

  if (!/\.\.\//.test(file.id)) {
    fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) return cb(new Error("Unable to read file:" + file.id));
      file.setContent(data);
      var tasks = file.extractTasks();
      self.addFile(file);
      cb(null, tasks);
    });
  } else return cb(new Error("Unable to read file:" + file.id));
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

Repository.prototype.deleteFile = function(id, cb) {
  if (!_.isFunction(cb)) cb = _.noop;
  var file = this.getFile(id);
  if (!_.isUndefined(file)) {
    var self = this;
    fs.unlink(this.getFullPath(file), function (err) {
      if (err) return cb("Unable to delete:" + id + " : " + err.toString());
      self.removeFile(file);
      self.emit("file.deleted", file);
      cb(null, file);
    });
  } else cb("Unable to delete:" + id);
};

Repository.prototype.hasDefaultFile = function() {

};

Repository.prototype.readDefaultFile = function() {

};

Repository.prototype.modifyTask = function(task) {

};

Repository.prototype.modifyListName = function(oldName, newName) {

};

module.exports = Repository;