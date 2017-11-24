'use strict';

// BACKLOG: Create list groups to show and hide for projects/repos id:11 gh:96
var _ = require('lodash');

/**
 * Description
 * @method List
 * @param {} name
 * @param {} hidden
 * @return
 */
function List(name, hidden) {
  this.name = name;
  this.hidden = hidden || false;
  this.tasks = [];
}

/**
 * Description
 * @method isList
 * @param {} list
 * @return BinaryExpression
 */
List.isList = function(list) {
  return list instanceof List;
};

/**
 * Description
 * @method isHidden
 * @return MemberExpression
 */
List.prototype.isHidden = function() {
  return this.hidden;
};

/**
 * Description
 * @method getName
 * @return MemberExpression
 */
List.prototype.getName = function() {
  return this.name;
};

/**
 * Description
 * @method getTasks
 * @return MemberExpression
 */
List.prototype.getTasks = function() {
  return this.tasks;
};

/**
 * Description
 * @method addTask
 * @param {} task
 * @return
 */
List.prototype.addTask = function(task) {
  if (!_.find(this.tasks, function(_task) { _task.equals(task); })) {
    this.tasks.push(task);
  }
};

/**
 * Description
 * @method setTasks
 * @param {} tasks
 * @return
 */
List.prototype.setTasks = function(tasks) {
  this.tasks = tasks;
};

/**
 * Description
 * @method hasTasks
 * @return BinaryExpression
 */
List.prototype.hasTasks = function() {
  return this.tasks.length > 0;
};

/**
 * Description
 * @method toConfig
 * @return ObjectExpression
 */
List.prototype.toConfig = function() {
  var self = this;
  return {name: self.name, hidden: self.hidden};
};

module.exports = List;
