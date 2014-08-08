'use strict';

var _ = require('lodash');

/**
 * Description
 * @method Task
 * @param {} obj
 * @return 
 */
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
  this.type = obj.type;
}

Task.Types = {
  CODE: "CODE",
  HASHTAG: "HASHTAG",
  MARKDOWN: "MARKDOWN"
};

/**
 * Description
 * @method isTask
 * @param {} task
 * @return BinaryExpression
 */
Task.isTask = function(task) {
  return task instanceof Task;
};

/**
 * Description
 * @method getRepoId
 * @return MemberExpression
 */
Task.prototype.getRepoId = function() {
  return this.repoId;
};

/**
 * Description
 * @method getSource
 * @return MemberExpression
 */
Task.prototype.getSource = function() {
  return this.source;
};

/**
 * Description
 * @method getId
 * @return MemberExpression
 */
Task.prototype.getId = function() {
  return this.id;
};

/**
 * Description
 * @method getList
 * @return MemberExpression
 */
Task.prototype.getList = function() {
  return this.list;
};

/**
 * Description
 * @method getText
 * @return MemberExpression
 */
Task.prototype.getText = function() {
  return this.text;
};

/**
 * Description
 * @method getHtml
 * @return MemberExpression
 */
Task.prototype.getHtml = function() {
  return this.html;
};

/**
 * Description
 * @method order
 * @return MemberExpression
 */
Task.prototype.order = function() {
  return this.order;
};

/**
 * Description
 * @method getLine
 * @return MemberExpression
 */
Task.prototype.getLine = function() {
  return this.line;
};

/**
 * Description
 * @method isCodeStyle
 * @return MemberExpression
 */
Task.prototype.isCodeStyle = function() {
  return this.codeStyle;
};

Task.prototype.getType = function() {
  return this.type;
};

/**
 * Description
 * @method equals
 * @param {} task
 * @return LogicalExpression
 */
Task.prototype.equals = function(task) {
  return task.getRepoId() == this.getRepoId() && 
         task.getSource().path == this.getSource().path &&
         task.getId() == this.getId();
};

module.exports = Task;