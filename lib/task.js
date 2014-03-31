var _ = require('lodash');

function Task(obj) {
  if (!(_.isObject(obj))) throw new Error("obj must be an Object");
  this.codeStyle =  obj.codeStyle || false;
  this.text = obj.text;
  this.html = obj.html;
  this.list = obj.list;
  this.order = obj.order;
  this.line = obj.line;
  this.id = obj.id;
  this.repoId = obj.repoId;
  this.source = obj.source;
}

Task.isTask = function(task) {
  return task instanceof Task;
};

Task.prototype.getRepoId = function() {
  return this.repoId;
};

Task.prototype.getSource = function() {
  return this.source;
};

Task.prototype.getId = function() {
  return this.id;
};

Task.prototype.getList = function() {
  return this.list;
};

Task.prototype.equals = function(task) {
  return task.getRepoId() == this.getRepoId() && 
         task.getSource().path == this.getSource().path &&
         task.getId() == this.getId();
};

module.exports = Task;