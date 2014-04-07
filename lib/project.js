var _      = require('lodash'),
    events = require('events'),
    fs     = require('fs'),
    async  = require('async'),
    util   = require('util'),
    wrench = require('wrench'),
    tools  = require('./tools'),
    List   = require('./list'),
    Task   = require('./task');

var ERRORS         = { NOT_A_TASK: "task must be a Task",
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

// TODO:10 Need a way to run only one operation at a time on a project or repo. Use [kue](https://www.npmjs.org/package/kue)
// TODO:20 Decide which listeners we should expose at the project level
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
    self.storeLists(self.getProjectLists(), cb);
  });
  else cb();
};

Project.prototype.createListeners = function() {
  var self = this;
  
  this.listFoundListener = function(list) {
    if (!self.listExists(list.name)) {
      self.storeLists(self.getProjectLists());
      self.emit('list.found');
    }
  };
  // DOING: Add file.update listener for repos and emit project.update
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

// DONE:20 Use async file operations
Project.prototype.saveConfig = function(cb) {
  var self = this;
  var dir = this.getConfigDir();
  var file = this.getConfigFile();
  
  fs.exists(dir, function(exists) {
    if (cb === undefined) cb = _.noop;
    if (!exists) wrench.mkdirSyncRecursive(dir);
    var config = JSON.stringify(self.getConfig(), null, 2);
    fs.writeFile(file, config, cb);
  });
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

Project.prototype.getRepoForFile = function(file) {
  return this.getRepo(file.getRepoId());
};

Project.prototype.getRepoForTask = function(task) {
  return this.getRepo(task.getRepoId());
};

Project.prototype.storeLists = function(lists, cb) {
  var self = this;
  if (cb === undefined) cb = _.noop;
  this.setLists(lists);
  this.saveConfig(function() {
    var funcs = _.map(self.getRepos(), function(repo) {
      return function(cb) { 
        repo.setLists(lists);
        repo.saveConfig(cb);
      };
    });

    if (funcs.length > 0) {
      async.parallel(funcs, cb);
    } else cb();
  });
};

Project.prototype.getProjectLists = function() {
  var self = this;
  var allLists = [];
  _.each(this.getRepos(), function(repo) {
    var lists = repo.getLists();
    allLists.push(lists);
  });

  if (allLists.length > 0) {
    var combinedLists = _.sortBy(_.uniq(_.flatten(allLists), 'name'), "name");

    var listsLength = this.getLists().length;

    if (listsLength > 0) {
      this.setLists(_.sortBy(combinedLists, function(list) {
        var index = _.findIndex(self.getLists(), {name: list.name});
        return (index === -1) ? listsLength :index;
      }));
    }
  }
  return this.getLists();
};

Project.prototype.getLists = function(repoId) {
  if (repoId && this.getRepo(repoId)) return this.getRepo(repoId).getLists();
  return this.getConfig().lists;  
};

Project.prototype.setLists = function(lists) {
  this.config.lists = lists;
};

Project.prototype.listExists = function(name) {
  return (_.findIndex(this.getLists(), { name: name }) > -1);
};

Project.prototype.moveList = function(name, pos, cb) {
  if (cb === undefined) cb = _.noop;
  var lists = this.getLists();
  var list = _.find(lists, {name:name});
  if (list) {
    lists = _.reject(lists, {name:name});
    lists.splice(pos, 0, list);
    this.storeLists(lists, cb);
  } else cb();
};

Project.prototype.renameList = function(oldName, newName, cb) {
  if (cb === undefined) cb = _.noop;
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
  var funcs = _.map(this.getRepos(), function(repo) {
    return function(cb) { repo.renameList(oldName, newName, cb); };
  });

  if (funcs.length > 0) {
    async.parallel(funcs, cb);
  } else cb();
};

function moveTask(project, task, newList, pos) {
  var self = this;

  if (!Task.isTask(task)) throw new Error(ERRORS.NOT_A_TASK);
  var toListTasks = project.getTasksInList(newList);
  if (toListTasks === undefined) throw new Error(LIST_NOT_FOUND, newList);

  var fromListTasks = project.getTasksInList(task.list);
  if (fromListTasks === undefined) throw new Error(LIST_NOT_FOUND, task.list);

  task.list = newList;

  // Move the task to the correct position in the list
  toListTasks = _.reject(toListTasks, function(_task) {
    return  _task.equals(task);
  });
  toListTasks.splice(pos,0,task);

  // Modify the tasks in current list
  _.each(toListTasks, function(_task, index) {
    var repo = project.getRepoForTask(_task);
    _task.order = index*10;
    repo.modifyTask(_task);
  });

  // Remove the task from the old list
  if (newList !== task.list) {
    fromListTasks = _.reject(fromListTasks, function(_task) {
      return  _task.equals(task);
    });
  
    _.each(fromListTasks, function(_task, index) {
      var repo = project.getRepoForTask(_task);
      _task.order = index*10;
      repo.modifyTask(_task);
    });
  }
}

// DONE:10 Test moveTasks
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

  // DOING:0 Pause the repo and this project before modifying tasks
  _.each(tasks, function(task, i) {
    moveTask(self, task, newList, newPos+i);
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

Project.prototype.getTasksInList = function(name) {
  var list = _.find(this.getTasks(), {name:name});
  return (list && list.tasks.length > 0) ? list.tasks : [];
};

module.exports = Project;
