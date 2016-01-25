'use strict';

function Issue(obj) {
  this.wrapped = obj;
  this.tasks = [];
}

Issue.prototype.addTask = function(task) {
  this.tasks.push(task);
};

Issue.prototype.removeAllTasks = function() {
  this.tasks = [];
};

Issue.prototype.getTasks = function() {
  return this.tasks;
};

Issue.prototype.setList = function(list) {
  this.list = list;
};

Issue.prototype.getList = function() {
  return this.list;
};
