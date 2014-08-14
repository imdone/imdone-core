'use strict';

var _      = require('lodash'),
    log    = require('debug')('imdone-core:Project'),
    events = require('events'),
    async  = require('async'),
    util   = require('util'),
    path   = require('path'),
    tools  = require('./tools'),
    List   = require('./list'),
    File   = require('./file'),
    Config = require('./config'),
    Task   = require('./task');

var ERRORS         = { NOT_A_TASK: "task must be a Task",
                       LIST_NOT_FOUND: "List with name '%s' does not exist",
                       REPO_NOT_FOUND: "Repo %s not found" },
    CONFIG_DIR     = ".imdone",
    CONFIG_FILE    = "config.json",
    DEFAULT_CONFIG = { lists: [] };

/**
 * Description
 * @method Project
 * @param {} owner
 * @param {} name
 * @param {} repos
 * @return 
 */
function Project(owner, name, repos) {
  events.EventEmitter.call(this);
  this.configBase = process.env.IMDONE_CONFIG_DIR || tools.userHome();
  this.owner = owner;
  this.name = name;
  this.repos = repos;
  this.busy = false;
  this.modifiedQ = [];
  this.loadConfig();

  this.createListeners();
}

Project.CONFIG_DIR = CONFIG_DIR;
Project.CONFIG_FILE = CONFIG_FILE;
Project.DEFAULT_CONFIG = DEFAULT_CONFIG;

util.inherits(Project, events.EventEmitter);

/**
 * Description
 * @method toJSON
 * @return CallExpression
 */
Project.prototype.toJSON = function() {
  return _.omit(this, 
    ["modifiedQ", 
     "modifiedInterval", 
     "_events", 
     "_maxListeners", 
     "domain"]);
};

// [Need a way to run only one operation at a time on a project or repo. Use [kue](https://www.npmjs.org/package/kue)](#archive:60)
// [Decide which listeners we should expose at the project level](#archive:110)
// [We should have a destroy method](#archive:150)
// emits project.modified, project.initialized, file.update, file.delete, file.processed
/**
 * Description
 * @method init
 * @param {} cb
 * @return 
 */
Project.prototype.init = function(cb) {
  var self = this, modifiedQ = [];
  cb = this.callIfBusySetIfNot(cb); 
  if (!cb) return;
  if (this.initialized) return cb();
  this.initTime = new Date().getTime();

  self.queueModified = function(data) {
    modifiedQ.push(data);
  };

  var modifiedQSink = function() {
    try {
      var len = modifiedQ.length;
      if (len > 0) {
        var mods = [];
        for (var i=0; i < len; i++) {
          mods.push(modifiedQ.pop());
        }
        var data = {project:self.name, mods:mods};
        self.emit('project.modified', data);
      }

    } catch (e) {
      console.log("Error draining modifiedQ", e);
    }
  };

  self.modifiedInterval = setInterval(modifiedQSink, 500);

  var funcs = _.map(this.getRepos(), function(repo) {
    return function(cb) {
      self.initRepo(repo, cb);
    };
  });

  if (funcs.length === 0) return cb("Project has no Repos to initialize");

  async.parallel(funcs, function(err, results) {
    self.storeLists(self.getProjectLists(), function() {
      self.initialized = true;
      cb(null);
      self.emit('project.initialized', {project:self.getName()});
    });
  });
};

Project.prototype.destroy = function() {
  if (this.modifiedInterval) clearInterval(this.modifiedInterval);
  delete this.repos;
};

/**
 * Description
 * @method callIfBusySetIfNot
 * @param {} cb
 * @return FunctionExpression
 */
Project.prototype.callIfBusySetIfNot = function(cb) {
  cb = tools.cb(cb);
  if (this.isBusy()) {
    cb("Project is busy");
    return false;
  }

  this.busy = true;
  var self = this;
  
  return  function() {
    self.busy = false;
    cb.apply(self,arguments);
  };
};

/**
 * Description
 * @method createListeners
 * @return 
 */
Project.prototype.createListeners = function() {
  var self = this;
  
  /**
   * Description
   * @method listFoundListener
   * @param {} list
   * @return 
   */
  this.listFoundListener = function(list) {
    if (list && !self.listExists(list.name)) {
      self.storeLists(self.getProjectLists());
    }
  };

  // [Add file.update and file.delete listener for repos and emit project.modified](#archive:80)
  /**
   * Description
   * @method fileUpdateListener
   * @param {} file
   * @return 
   */
  this.fileUpdateListener = function(file) {
    // [fix emit modified by saving these up and emitting only if a backlog exists](#archive:120)
    self.emit('file.update', {project:self.getName(), file:file});
    self.queueModified({mod:'file.update', file:file.getPath()});
  };

  /**
   * Description
   * @method fileDeleteListener
   * @param {} file
   * @return 
   */
  this.fileDeleteListener = function(file) {
    self.emit('file.delete', {project:self.getName(), file:file});
    self.queueModified({mod:'file.delete', file:file.getPath()});
  };

  /**
   * Description
   * @method fileProcessedListener
   * @param {} data
   * @return 
   */
  this.fileProcessedListener = function(data) {
    var now = (new Date()).getTime();
    if (!self.lastFileProcessed) self.lastFileProcessed = now;
    _.extend(data, {project:self.getName(), time:now});
    self.emit('file.processed', data);
    if (now-self.lastFileProcessed > 10) {
      self.emit('files.processed', _.omit(data, ["ok", "file"]));
      self.lastFileProcessed = now;
    }
  };

};

/**
 * Description
 * @method getConfigDir
 * @return CallExpression
 */
Project.prototype.getConfigDir = function() {
  return path.join(this.configBase, CONFIG_DIR, this.getName().replace(" ", "_")); 
};

/**
 * Description
 * @method getConfigFile
 * @return CallExpression
 */
Project.prototype.getConfigFile = function() {
  return path.join(this.getConfigDir(), CONFIG_FILE);
};

/**
 * Description
 * @method loadConfig
 * @return MemberExpression
 */
Project.prototype.loadConfig = function() {
  this.config = DEFAULT_CONFIG;
};

// [Use async file operations](#archive:70)
// [Only save config if there is more than one repo](#archive:140)
/**
 * Description
 * @method saveConfig
 * @param {} cb
 * @return 
 */
Project.prototype.saveConfig = function(cb) {
  cb();
};

/**
 * Description
 * @method isBusy
 * @return BinaryExpression
 */
Project.prototype.isBusy = function() {
  return this.busy === true;
};

/**
 * Description
 * @method getConfig
 * @return MemberExpression
 */
Project.prototype.getConfig = function() {
  return this.config;
};

/**
 * Description
 * @method getOwner
 * @return MemberExpression
 */
Project.prototype.getOwner = function() {
  return this.owner;
};

/**
 * Description
 * @method getName
 * @return MemberExpression
 */
Project.prototype.getName = function() {
  return this.name;
};

/**
 * Description
 * @method getRepos
 * @return MemberExpression
 */
Project.prototype.getRepos = function() {
  return this.repos;
};

/**
 * Description
 * @method getRepo
 * @param {} id
 * @return CallExpression
 */
Project.prototype.getRepo = function(id) {
  return _.find(this.getRepos(), function(repo) {
    return repo.getId() === id;
  });
};

/**
 * Description
 * @method getRepoForFile
 * @param {} file
 * @return CallExpression
 */
Project.prototype.getRepoForFile = function(file) {
  return this.getRepo(file.getRepoId());
};

/**
 * Description
 * @method getRepoForTask
 * @param {} task
 * @return CallExpression
 */
Project.prototype.getRepoForTask = function(task) {
  return this.getRepo(task.getRepoId());
};

// [Implement addRepo and removeRepo](#archive:90)
/**
 * Description
 * @method removeRepo
 * @param {} repoId
 * @return 
 */
Project.prototype.removeRepo = function(repoId) {
  var repo = this.getRepo(repoId);
  if (repo) {
    this.repos = _.reject(this.repos, { id: repoId });
    repo.destroy();
  }
};

/**
 * Description
 * @method addRepo
 * @param {} repo
 * @param {} cb
 * @return 
 */
Project.prototype.addRepo = function(repo, cb) {
  cb = tools.cb(cb);
  var self = this;
  if (this.getRepo(repo.getId()) === undefined) {
    this.repos.push(repo);
    this.initRepo(repo, function() {
      self.storeLists(self.getProjectLists(), cb);
      self.queueModified({mod:'repo.add', repoId:repo.getId()});
    });
  } else cb();
};

/**
 * Description
 * @method initRepo
 * @param {} repo
 * @param {} cb
 * @return 
 */
Project.prototype.initRepo = function(repo, cb) {
  repo.project = this;

  repo.removeListener('list.found', this.listFoundListener);
  repo.on('list.found', this.listFoundListener);
  
  repo.removeListener('file.update', this.fileUpdateListener);
  repo.on('file.update', this.fileUpdateListener);
  
  repo.removeListener('file.delete', this.fileDeleteListener);
  repo.on('file.delete', this.fileDeleteListener);

  repo.removeListener('file.processed', this.fileProcessedListener);
  repo.on('file.processed', this.fileProcessedListener);

  repo.init(cb); 
};

/**
 * Description
 * @method storeLists
 * @param {} lists
 * @param {} cb
 * @return 
 */
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

/**
 * Description
 * @method getProjectLists
 * @return CallExpression
 */
Project.prototype.getProjectLists = function() {
  var self = this;
  var allLists = [];
  _.each(this.getRepos(), function(repo) {
    var lists = repo.getLists();
    allLists.push(lists);
  });

  if (allLists.length > 0) {
    var combinedLists = _.uniq(_.flatten(allLists), 'name');

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

/**
 * Description
 * @method sortLists
 * @param {} lists
 * @return lists
 */
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

/**
 * Description
 * @method getLists
 * @param {} repoId
 * @return MemberExpression
 */
Project.prototype.getLists = function(repoId) {
  if (repoId && this.getRepo(repoId)) return this.getRepo(repoId).getLists();
  return this.getConfig().lists;
};

/**
 * Description
 * @method setLists
 * @param {} lists
 * @return ThisExpression
 */
Project.prototype.setLists = function(lists) {
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
Project.prototype.listExists = function(name) {
  return (_.findIndex(this.getLists(), { name: name }) > -1);
};

/**
 * Description
 * @method moveList
 * @param {} name
 * @param {} pos
 * @param {} cb
 * @return 
 */
Project.prototype.moveList = function(name, pos, cb) {
  var self = this;
  cb = this.callIfBusySetIfNot(cb); if (!cb) return;
  var lists = this.getLists();
  var list = _.find(lists, {name:name});
  if (list) {
    lists = _.reject(lists, {name:name});
    lists.splice(pos, 0, list);
    this.storeLists(lists, function(err, result) {
      if (!err) self.queueModified({mod:'list.move', list:{name:name, pos:pos}});
      cb(err, result);
    });
  } else {
    cb();
  }
  // [Fix all empty cb to return error](#archive:100)
};

/**
 * Description
 * @method renameList
 * @param {} oldName
 * @param {} newName
 * @param {} cb
 * @return 
 */
Project.prototype.renameList = function(oldName, newName, cb) {
  cb = this.callIfBusySetIfNot(cb); if (!cb) return;
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
      if (!err) self.queueModified({mod:"list.rename", list:{oldName:oldName, newName:newName}});
      cb(err, results);
    });
  } else {
    cb();
  }
};

/**
 * Description
 * @method moveTask
 * @param {} project
 * @param {} task
 * @param {} newList
 * @param {} newPos
 * @return 
 */
function moveTask(project, task, newList, newPos) {
  if (!Task.isTask(task)) task = new Task(task);
  var toListTasks = project.getTasksInList(newList);

  if (toListTasks === undefined) throw new Error(ERRORS.LIST_NOT_FOUND, newList);

  var fromListTasks = project.getTasksInList(task.list);
  if (fromListTasks === undefined) throw new Error(ERRORS.LIST_NOT_FOUND, task.list);

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

// [Test moveTasks](#archive:90)
/**
 * Description
 * @method moveTasks
 * @param {} tasks
 * @param {} newList
 * @param {} newPos
 * @param {} cb
 * @return 
 */
Project.prototype.moveTasks = function(tasks, newList, newPos, cb) {
  var self = this;
  cb = this.callIfBusySetIfNot(cb); if (!cb) return;
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
      if (!err) {
        var mods = _.map(filesToSave, 
                         function(obj) { 
                           return {path:obj.file.getPath(), repoId:obj.repo.getId()};
                         });

        self.queueModified({mod:'task.move', files:mods});
      }
      cb(err, results);
    });
  } else {
    cb();
  }
};

/**
 * Description
 * @method getTasks
 * @param {} repoId
 * @param {} excludeHiddenTasks
 * @return lists
 */
Project.prototype.getTasks = function(repoId, excludeHiddenTasks) {
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

  if (excludeHiddenTasks) {
    lists = _.map(lists, function(list) {
      if (list.hidden) delete list.tasks;
      return list; 
    });
  }

  return lists;
};

/**
 * Description
 * @method getTasksInList
 * @param {} name
 * @return ConditionalExpression
 */
Project.prototype.getTasksInList = function(name) {
  var list = _.find(this.getTasks(), {name:name});
  return (list && list.tasks.length > 0) ? list.tasks : [];
};

/**
 * Description
 * @method hideList
 * @param {} name
 * @param {} cb
 * @return 
 */
Project.prototype.hideList = function(name, cb) {
  cb = tools.cb(cb);
  var self = this;
  var list = _.find(this.getLists(), {name:name});
  if (list) {
    list.hidden = true;
    this.storeLists(this.getLists(), function() {
      self.queueModified({mod:'list.hide', list:{name: name}});
      cb();
    });
  } else cb("List does not exist.");
};

/**
 * Description
 * @method showList
 * @param {} name
 * @param {} cb
 * @return 
 */
Project.prototype.showList = function(name, cb) {
  cb = tools.cb(cb);
  var self = this;
  var list = _.find(this.getLists(), {name:name});
  if (list) {
    list.hidden = false;
    this.storeLists(this.getLists(), function() {
      self.queueModified({mod:'list.show', list:{name:name}});
      cb();
    });
  } else cb("List does not exist.");
};

// [User should be able to add a list to a project](#archive:50)
/**
 * Description
 * @method addList
 * @param {} name
 * @param {} cb
 * @return 
 */
Project.prototype.addList = function(name, cb) {
  cb = this.callIfBusySetIfNot(cb); if (!cb) return;
  var self = this;
  if (_.find(this.getConfig().lists)) return cb('A list with that name already exists');
  this.getConfig().lists.push(new List(name, false));
  this.storeLists(this.getLists(), function(err, result) {
    self.queueModified({mod:'list.add', list:{name: name}});
    cb(err, result);
  });
};

/**
 * Description
 * @method removeList
 * @param {} name
 * @param {} cb
 * @return 
 */
Project.prototype.removeList = function(name, cb) {
  cb = tools.cb(cb);
  var self = this;
  if (this.getTasksInList(name).length > 0) return cb("Can't remove a list with tasks!"); 
  var list = _.find(this.getLists(), {name:name});
  if (list) {
    this.storeLists(_.reject(this.getLists(), {name:name}), function() {
      self.queueModified({mod:'list.remove',list:{name:name}});
      cb();
    });
  } else cb("List does not exist.");
};

/**
 * Description
 * @method getFilesInPath
 * @param {} repoId
 * @param {} includeDirs
 * @return files
 */
Project.prototype.getFilesInPath = function(repoId, includeDirs) {
  if (typeof repoId === 'boolean') includeDirs = repoId; repoId = null;
  if (repoId) return this.getRepo(repoId).getFilesInPath(includeDirs);
  var files = [];
  _.each(this.getRepos(), function(repo) {
    _.each(repo.getFilesInPath(includeDirs), function(file) {
      files.push(file);
    });
  });
  return files;
};

// [getFilesTree should return a nested list of files](#archive:50)
/**
 * Description
 * @method getFileTree
 * @param {} repoId
 * @return ConditionalExpression
 */
Project.prototype.getFileTree = function(repoId) {
  var repo = this.getRepo(repoId);
  return repo ? repo.getFileTree() : undefined;
};

/**
 * Description
 * @method getFileWithContent
 * @param {} repoId
 * @param {} path
 * @return undefined
 */
Project.prototype.getFileWithContent = function(repoId, path) {
  var repo = this.getRepo(repoId);
  if (repo) {
    var file = repo.getFile(path);
    if (file) return repo.readFileContentSync(file);
  }
  return undefined;
};

/**
 * Description
 * @method readFileContentSync
 * @param {} file
 * @return undefined
 */
Project.prototype.readFileContentSync = function(file) {
  var repo = this.getRepo(file.getRepoId());
  if (repo) {
    if (file) return repo.readFileContentSync(file);
  }
  return undefined;
};

/**
 * Description
 * @method saveFile
 * @param {} repoId
 * @param {} path
 * @param {} content
 * @param {} cb
 * @return 
 */
Project.prototype.saveFile = function(repoId, path, content, cb) {
  var self = this;
  cb = this.callIfBusySetIfNot(cb); if (!cb) return;
  var repo = this.getRepo(repoId);
  if (repo === undefined)  {
    return cb(util.format(ERRORS.REPO_NOT_FOUND, repoId));
  }
  var file = new File(repoId, path, content);
  repo.writeFile(file, function(err, file) {
    cb(err, file);
  });
};

/**
 * Description
 * @method deleteFile
 * @param {} repoId
 * @param {} path
 * @param {} cb
 * @return 
 */
Project.prototype.deleteFile = function(repoId, path, cb) {
  var self = this;
  cb = this.callIfBusySetIfNot(cb); if (!cb) return;
  var repo = this.getRepo(repoId);
  if (repo === undefined) return cb(util.format(ERRORS.REPO_NOT_FOUND, repoId));
  repo.deleteFile(path, cb);  
};

module.exports = Project;
