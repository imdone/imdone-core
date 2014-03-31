var _     = require('lodash'),
    async = require('async'),
    List  = require('./list'),
    Task  = require('./task');

var errors = {
  NOT_A_TASK: "tasks must be a Task",
  LIST_NOT_FOUND: "List with name '%s' does not exist"
};

function Project(owner, name, repos) {
  this.owner = owner;
  this.name = name;
  this.repos = repos;
  this.lists = [];
}

Project.prototype.init = function(cb) {
  if (cb === undefined) cb = _.noop;
  var funcs = _.map(this.getRepos(), function(repo) {
    return function(cb) { repo.init(cb); };
  });
  if (funcs.length > 0) async.parallel(funcs, cb);
  else cb();
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

Project.prototype.modifyListName = function(oldName, newName) {

};

function moveTask(project, task, newList, newPos) {
  var self = this;

  if (!Task.isTask) throw new Error(errors.NOT_A_TASK);
  var toList = project.getTasks(newList);
  if (toList === undefined) throw new Error(LIST_NOT_FOUND, newList);

  var fromList = project.getTasks(task.list);
  if (fromList === undefined) throw new Error(LIST_NOT_FOUND, task.list)

  // Move the task to the correct position in the list
  toList.tasks = _.reject(toList.tasks, function(_task) {
    return  _task.equals(task);
  });
  toList.tasks.splice(pos,0,task);

  // Modify the tasks in current list
  _.each(toList.tasks, function(_task, index) {
    var repo = project.getRepo(_task.repoId)
    _task.order = index*10;
    repo.modifyTask(_task);
  });

  // Remove the task from the old list
  if (newList !== task.list) {
    fromList.tasks = _.reject(fromList.tasks, function(_task) {
      return  _task.equals(task);
    });
  
    _.each(fromList.tasks, function(task, index) {
      var repo = project.getRepo(_task.repoId)
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

Project.prototype.saveListNames = function() {

};

Project.prototype.getRepo = function(id) {
  return _.find(this.getRepos, function(repo) {
    return repo.getId() == id;
  });
};

Project.prototype.getTasks = function(listName) {
  var lists = [];
  _.each(this.getRepos(), function(repo) {
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

  if (listName) return _.find(lists, {name:listName});
  return _.sortBy(lists, 'name');
};


module.exports = Project;