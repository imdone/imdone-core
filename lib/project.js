var _      = require('lodash'),
    events = require('events'),
    fs     = require('fs'),
    async  = require('async'),
    util   = require('util'),
    wrench = require('wrench'),
    tools  = require('./tools'),
    List   = require('./list'),
    Task   = require('./task');

var ERRORS         = { NOT_A_TASK: "tasks must be a Task",
                       LIST_NOT_FOUND: "List with name '%s' does not exist" },
    CONFIG_DIR     = ".imdone",
    CONFIG_FILE    = "config.js",
    DEFAULT_CONFIG = { lists: [] };

function Project(owner, name, repos) {
  events.EventEmitter.call(this);
  this.configBase = process.env.IMDONE_CONFIG_DIR || tools.userHome();
  if (!fs.existsSync(this.configBase) || !fs.statSync(this.configBase).isDirectory())
    throw new Error("IMDONE_CONFIG_DIR must be an existing directory on the file system");

  this.owner = owner;
  this.name = name;
  this.repos = repos;
  this.config = this.loadConfig() || {};
  _.defaults(this.config, _.cloneDeep(DEFAULT_CONFIG));

  this.createListeners();
}

util.inherits(Project, events.EventEmitter);

// DOING:0 Decide which listeners we should expose at the project level
Project.prototype.init = function(cb) {
  var self = this;
  if (cb === undefined) cb = _.noop;
  var funcs = _.map(this.getRepos(), function(repo) {
    return function(cb) {
      repo.removeListener('list.found', self.listFoundListener);
      repo.on('list.found', self.listFoundListener);
      repo.init(cb); 
    };
  });
  if (funcs.length > 0) async.parallel(funcs, function(err, results) {
    self.sortAndStoreLists();
    cb(err, results);
  });
  else cb();
};

Project.prototype.createListeners = function() {
  var self = this;
  
  this.listFoundListener = function(list) {
    self.sortAndStoreLists();
    self.emit('list.found');
  };
};

Project.prototype.getConfigDir = function() {
  return util.format("%s/%s/%s", this.configBase, CONFIG_DIR, this.getName().replace(" ", "_")); 
};

Project.prototype.getConfigFile = function() {
  return util.format("%s/%s", this.getConfigDir(), CONFIG_FILE);
};

Project.prototype.loadConfig = function() {
  var file = this.getConfigFile();
  if (fs.existsSync(file)) this.config = JSON.parse(fs.readFileSync(file));
  return this.config;
};

// TODO: Use async file operations
Project.prototype.saveConfig = function() {
  var dir = this.getConfigDir();
  var file = this.getConfigFile();
  console.log(file);
  if (!fs.existsSync(dir)) {
    wrench.mkdirSyncRecursive(dir);
  }
  var config = JSON.stringify(this.getConfig(), null, 2);
  fs.writeFileSync(file, config);
};

Project.prototype.getConfig = function() {
  return this.config;
};

Project.prototype.getOwner = function() {
  return this.owner;
};

Project.prototype.getName = function() {
  return this.name;
};

Project.prototype.getRepos = function() {
  return this.repos;
};

Project.prototype.getRepo = function(id) {
  return _.find(this.getRepos(), function(repo) {
    return repo.getId() === id;
  });
};

Project.prototype.sortAndStoreLists = function() {
  this.config.lists = this.getLists();
  this.saveConfig();
};

Project.prototype.getLists = function(repoId) {
  if (repoId && this.getRepo(repoId)) return this.getRepo(repoId).getLists();
  var lists = [];
  _.each(this.getRepos(), function(repo) {
    lists.push(repo.getLists());
  });

  return _.uniq(_.flatten(lists), 'name');
};

Project.prototype.moveList = function(listName, pos) {
  //var lists = this.getLists
};

Project.prototype.modifyListName = function(oldName, newName, cb) {

};

function moveTask(project, task, newList, newPos) {
  var self = this;

  if (!Task.isTask) throw new Error(ERRORS.NOT_A_TASK);
  var toList = project.getTasks(newList);
  if (toList === undefined) throw new Error(LIST_NOT_FOUND, newList);

  var fromList = project.getTasks(task.list);
  if (fromList === undefined) throw new Error(LIST_NOT_FOUND, task.list);

  // Move the task to the correct position in the list
  toList.tasks = _.reject(toList.tasks, function(_task) {
    return  _task.equals(task);
  });
  toList.tasks.splice(pos,0,task);

  // Modify the tasks in current list
  _.each(toList.tasks, function(_task, index) {
    var repo = project.getRepo(_task.repoId);
    _task.order = index*10;
    repo.modifyTask(_task);
  });

  // Remove the task from the old list
  if (newList !== task.list) {
    fromList.tasks = _.reject(fromList.tasks, function(_task) {
      return  _task.equals(task);
    });
  
    _.each(fromList.tasks, function(task, index) {
      var repo = project.getRepo(_task.repoId);
      _task.order = index*10;
      repo.modifyTask(_task);
    });
  }
}

Project.prototype.moveTasks = function(tasks, newList, newPos, cb) {
  var self = this;
  if (cb === undefined) cb = _.noop;
  var filesToSave = [];
  _.each(this.getRepos(), function(repo) {
    _.each(repo.getFiles(), function(file) {
      file.once('file.modified', function(file) {
        filesToSave.push({file:file, repo:repo});
      });
    });
  });

  // DOING:10 Pause the repo and this project before modifying tasks
  _.each(tasks, function(task) {
    moveTask(self, task, newList, newPos);
  });

  var funcs = _.map(filesToSave, function(fileToSave) {
    return function(cb) { fileToSave.repo.writeFile(fileToSave.file, cb); };
  });

  if (funcs.length > 0) {
    async.parallel(funcs, cb);
  } else cb();
};

Project.prototype.getTasks = function(repoId) {
  var lists = [];
  var repos = (repoId && this.getRepo(repoId)) ? [this.getRepo(repoId)] : this.getRepos();
  _.each(repos, function(repo) {
    _.each(repo.getTasks(), function(task) {
      var listName = task.getList();
      var list = _.find(lists, {name:listName});
      if (list === undefined) {
        list = new List(listName);
        lists.push(list);
      }
      list.addTask(task);
    });
  });

  _.each(lists, function(list) {
    list.setTasks(_.sortBy(list.getTasks(), ['order', 'text']));
  });

  return lists;
};


module.exports = Project;