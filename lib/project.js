var _      = require('lodash'),
    log    = require('debug')('Project'),
    events = require('events'),
    fs     = require('fs'),
    async  = require('async'),
    util   = require('util'),
    path   = require('path'),
    wrench = require('wrench'),
    tools  = require('./tools'),
    List   = require('./list'),
    File   = require('./file'),
    Task   = require('./task');

var ERRORS         = { NOT_A_TASK: "task must be a Task",
                       LIST_NOT_FOUND: "List with name '%s' does not exist",
                       REPO_NOTFOUND: "Repo %s not found" },
    CONFIG_DIR     = ".imdone",
    CONFIG_FILE    = "config.json",
    DEFAULT_CONFIG = { lists: [] };

function Project(owner, name, repos) {
  events.EventEmitter.call(this);
  this.configBase = process.env.IMDONE_CONFIG_DIR || tools.userHome();
  if (!fs.existsSync(this.configBase) || !fs.statSync(this.configBase).isDirectory())
    throw new Error("IMDONE_CONFIG_DIR must be an existing directory on the file system");

  this.owner = owner;
  this.name = name;
  this.repos = repos;
  this.busy = false;
  this.config = this.loadConfig() || {};
  _.defaults(this.config, _.cloneDeep(DEFAULT_CONFIG));

  this.createListeners();
}

util.inherits(Project, events.EventEmitter);

// TODO:10 Need a way to run only one operation at a time on a project or repo. Use [kue](https://www.npmjs.org/package/kue)
// TODO:20 Decide which listeners we should expose at the project level
// emits list.rename, list.found, list.moved, tasks.moved, project.modified, project.initialized
Project.prototype.init = function(cb) {
  var self = this;
  cb = tools.cb(cb);
  if (this.callIfBusySetIfNot(cb)) return;
  var funcs = _.map(this.getRepos(), function(repo) {
    return function(cb) {
      self.initRepo(repo, cb);
    };
  });
  if (funcs.length > 0) async.parallel(funcs, function(err, results) {
    self.storeLists(self.getProjectLists(), function() {
      self.busy = false;
      cb();
    });
    self.emit('project.initialized', {project:self.getName()});
  });
  else {
    this.busy = false;
    cb();
  }
};

Project.prototype.callIfBusySetIfNot = function(cb) {
  if (this.isBusy()) return cb("Project is busy");
  this.busy = true;
  return false;
}

Project.prototype.createListeners = function() {
  var self = this;
  
  this.listFoundListener = function(list) {
    if (!self.listExists(list.name)) {
      self.storeLists(self.getProjectLists());
      self.emit('list.found', {list:list});
    }
  };

  // DOING:10 Add file.update anf file.delete listener for repos and emit project.update
  this.fileUpdateListener = function(file) {
    self.emit('project.update', {project:self.getName()});
  };

  this.fileDeleteListener = function(file) {
    self.emit('project.update', {project:self.getName()});
  };

};

Project.prototype.getConfigDir = function() {
  return path.join(this.configBase, CONFIG_DIR, this.getName().replace(" ", "_")); 
};

Project.prototype.getConfigFile = function() {
  return path.join(this.getConfigDir(), CONFIG_FILE);
};

Project.prototype.loadConfig = function() {
  var file = this.getConfigFile();
  if (fs.existsSync(file)) {
    this.config = JSON.parse(fs.readFileSync(file));
  }
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
    var config = _.cloneDeep(self.getConfig(), function(val) { 
      return val.tasks ? {name: val.name, hidden: val.hidden} : undefined;
    });
    fs.writeFile(file, JSON.stringify(config, null, 2), cb);
  });
};

Project.prototype.isBusy = function() {
  return this.busy;
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

// DOING:0 Implement addRepo and removeRepo
Project.prototype.removeRepo = function(repoId) {
  var repo = this.getRepo(repoId);
  if (repo) {
    this.repos = _.reject(this.repos, { id: repoId });
    repo.destroy();
  }
};

Project.prototype.addRepo = function(repo, cb) {
  cb = tools.cb(cb);
  if (this.getRepo(repo.getId()) === undefined) {
    this.repos.push(repo);
    this.initRepo(repo, function() {
      self.storeLists(self.getProjectLists(), cb);
    });
  } else cb();
};

Project.prototype.initRepo = function(repo, cb) {
  repo.removeListener('list.found', this.listFoundListener);
  repo.on('list.found', this.listFoundListener);
  repo.removeListener('file.update', this.fileUpdateListener);
  repo.on('file.update', this.fileUpdateListener);
  repo.removeListener('file.delete', this.fileDeleteListener);
  repo.on('file.delete', this.fileDeleteListener);

  repo.init(cb); 
};

Project.prototype.storeLists = function(lists, cb) {
  var self = this;
  cb = tools.cb(cb);
  this.setLists(lists);
  log("Storing lists:%s", JSON.stringify(lists,null,5));
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

    var listsLength = combinedLists.length;

    if (listsLength > 0) {
      this.setLists(_.sortBy(combinedLists, function(list) {
        var index = _.findIndex(self.getLists(), {name: list.name});
        return (index === -1) ? listsLength :index;
      }));
    }
  }
  return this.getLists();
};

Project.prototype.sortLists = function(lists) {
    var self        = this,
        listsLength = lists.length;

    if (listsLength > 0) {
      lists = _.sortBy(lists, function(list) {
        var index = _.findIndex(self.getLists(), {name: list.name});
        return (index === -1) ? listsLength :index;
      });
    }

    return lists;
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
  var self = this;
  cb = tools.cb(cb);
  if (this.callIfBusySetIfNot(cb)) return;
  var lists = this.getLists();
  var list = _.find(lists, {name:name});
  if (list) {
    lists = _.reject(lists, {name:name});
    lists.splice(pos, 0, list);
    this.storeLists(lists, function(err, result) {
      if (!err) self.emit('list.moved', {list:list, pos:pos});
      self.busy = false;
      cb(err, result);
    });
  } else {
    this.busy = false;
    cb();
  }
  // TODO:0 Fix all empty cb to return error
};

Project.prototype.renameList = function(oldName, newName, cb) {
  cb = tools.cb(cb);
  if (this.callIfBusySetIfNot(cb)) return;
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
    async.parallel(funcs, function(err, results) {
      if (!err) self.emit('list.rename', {oldName:oldName, newName:newName, err:err}); 
      self.busy = false;
      cb(err, results);
    });
  } else {
    this.busy = false;
    cb();
  }
};

function moveTask(project, task, newList, newPos) {
  var self = this;

  if (!Task.isTask(task)) task = new Task(task);
  var toListTasks = project.getTasksInList(newList);

  if (toListTasks === undefined) throw new Error(LIST_NOT_FOUND, newList);

  var fromListTasks = project.getTasksInList(task.list);
  if (fromListTasks === undefined) throw new Error(LIST_NOT_FOUND, task.list);

  task.list = newList;

  // Move the task to the correct position in the list
  toListTasks = _.reject(toListTasks, function(_task) {
    return  _task.equals(task);
  });
  toListTasks.splice(newPos,0,task);

  // Modify the tasks in current list
  _.each(toListTasks, function(_task, index) {
    var repo = project.getRepoForTask(_task);
    _task.order = index*10;
    log("Task... text:%s list:%s order:%d path:%s id:%d", _task.text, _task.list, _task.order, _task.source.path, _task.id);
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
  cb = tools.cb(cb);
  if (this.callIfBusySetIfNot(cb)) return;
  _.each(tasks, function(task, i) {
    log("Moving task to %d in %s", newPos+i, newList);
    moveTask(self, task, newList, newPos+i);
  });

  var filesToSave = [];
  _.each(this.getRepos(), function(repo) {
    _.each(repo.getFiles(), function(file) {
      if (file.isModified()) filesToSave.push({file:file, repo:repo});
    });
  });

  var funcs = _.map(filesToSave, function(fileToSave) {
    return function(cb) { fileToSave.repo.writeFile(fileToSave.file, cb); };
  });

  if (funcs.length > 0) {
    async.parallel(funcs, function(err, results) {
      if (!err) self.emit('tasks.moved', {tasks:tasks, newList:newList, newPos:newPos});
      self.busy = false;
      cb(err, results);
    });
  } else {
    self.busy = false;
    cb();
  }
};

Project.prototype.getTasks = function(repoId) {
  // clone the lists, so we don't modify them
  var lists = _.map(this.getLists(), function(list) { return new List(list.name, list.hidden); });
  var repos = (repoId && this.getRepo(repoId)) ? [this.getRepo(repoId)] : this.getRepos();
  _.each(repos, function(repo) {
    _.each(repo.getTasks(), function(task) {
      var listName = task.getList();
      var list = _.find(lists, {name:listName});
      if (list === undefined) {
        list = new List(listName);
        lists.push(list);
      }
      log("adding task:%j", task);
      list.addTask(task);
    });
  });

  _.each(lists, function(list) {
    list.setTasks(_.sortBy(list.getTasks(), ['order', 'text']));
  });

  lists = this.sortLists(lists);

  return lists;
};

Project.prototype.getTasksInList = function(name) {
  var list = _.find(this.getTasks(), {name:name});
  return (list && list.tasks.length > 0) ? list.tasks : [];
};

Project.prototype.hideList = function(name, cb) {
  cb = tools.cb(cb);
  var list = _.find(this.getLists(), {name:name});
  if (list) {
    list.hidden = true;
    this.storeLists(this.getLists(), cb);
  } else cb("List does not exist.");
};

Project.prototype.showList = function(name, cb) {
  cb = tools.cb(cb);
  var list = _.find(this.getLists(), {name:name});
  if (list) {
    list.hidden = false;
    this.storeLists(this.getLists(), cb);
  } else cb("List does not exist.");
};

Project.prototype.removeList = function(name, cb) {
  cb = tools.cb(cb);
  if (this.getTasksInList(name).length > 0) return cb("Can't remove a list with tasks!"); 
  var list = _.find(this.getLists(), {name:name});
  if (list) {
    this.storeLists(_.reject(this.getLists(), {name:name}), cb);
  } else cb("List does not exist.");
};

Project.prototype.getFilesInRepo = function(repoId, includeDirs) {
  var repo = this.getRepo(repoId);
  return repo ? repo.getFilesInPath(includeDirs) : undefined;
};

Project.prototype.getFileWithContent = function(repoId, path) {
  var repo = this.getRepo(repoId);
  if (repo) {
    var file = repo.getFile(path);
    if (file) return repo.readFileContentSync(file);
  }
  return undefined;
};

Project.prototype.saveFile = function(repoId, path, content, cb) {
  var self = this;
  cb = tools.cb(cb);
  if (this.callIfBusySetIfNot(cb)) return;
  var repo = this.getRepo(repoId);
  if (repo === undefined) return cb(util.format(ERRORS.REPO_NOTFOUND, repoId));
  var file = new File(repoId, relPath, content);
  repo.writeFile(file, function(err, file) {
    self.busy = false;
    cb(err, file);
  });
};

module.exports = Project;
