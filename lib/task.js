'use strict';

var _      = require('lodash'),
    util   = require('util'),
    marked = require('marked');

/**
 * Description
 * @method Task
 * @param {} obj
 * @return 
 */
function Task(obj) {
  if (!(_.isObject(obj))) throw new Error("obj must be an Object");
  this.text = obj.text;
  this.list = obj.list;
  this.order = obj.order;
  this.line = obj.line;
  this.id = obj.id;
  this.repoId = obj.repoId;
  this.source = obj.source;
  this.type = obj.type;
  this.parseTodoTxt();
}

Task.Types = {
  CODE: "CODE",
  HASHTAG: "HASHTAG",
  MARKDOWN: "MARKDOWN"
};

Task.TagsRegExp = /\s\+(\w*)/gi;
Task.getTags = function(text) {
  var tags, result, re = new RegExp(Task.TagsRegExp);
  
  while ((result = re.exec(text)) !== null) {
    if (!tags) tags = [];
    tags.push(result[1]);
  }

  return tags;
};

Task.getContext = function(text) {
  var context, result, re = /\s\@(\w*)/gi;
  
  while ((result = re.exec(text)) !== null) {
    if (!context) context = [];
    context.push(result[1]);
  }

  return context;
};

Task.DatesRegExp = /^(x (\d{4}-\d{2}-\d{2})\s)?((\d{4}-\d{2}-\d{2})\s)?/;
Task.getDates = function(text) {
  var re = new RegExp(Task.DatesRegExp);
  var result = re.exec(text);
  if (result) {
    var dates = {};
    if (result[2]) dates.completed = result[2];
    if (result[4]) dates.created = result[4];
    return dates;
  }
};

Task.MetaRegExp = /(\S+):(?!\/\/)(\S+)/g;
Task.getMetaData = function(text) {
  var meta, result, re = new RegExp(Task.MetaRegExp);
  while((result = re.exec(text)) !== null) {
    if (!meta) meta = {};
    var key = result[1];
    var val = result[2];
    meta[key] = val;
  }

  return meta;
};


//#DONE:10 This is where we should look for tags /\s\+(\w*)/gi; and context /\s\@(\w*)/gi; +feature
Task.prototype.parseTodoTxt = function() {
  this.tags = Task.getTags(this.text);
  this.context = Task.getContext(this.text);
  this.meta = Task.getMetaData(this.text);
  if (this.meta && /^\d{4}-\d{2}-\d{2}$/.test(this.meta.due)) {
    this.dateDue = this.meta.due;
    delete this.meta.due;
  }

  var dates = Task.getDates(this.text);
  if (dates) {
    this.dateCreated = dates.created;
    this.dateCompleted = dates.completed;
  }
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

Task.prototype.getTags = function() {
  return this.tags;
};

Task.prototype.getContext = function() {
  return this.context;
};

Task.prototype.getMetaData = function() {
  return this.meta;
};

Task.prototype.getDateDue = function() {
  return this.dateDue;
};

Task.prototype.getDateCreated = function() {
  return this.dateCreated;
};

Task.prototype.getDateCompleted = function() {
  return this.dateCompleted;
};

Task.prototype.hasDates = function() {
  return (this.dateDue !== undefined ||
          this.dateCompleted !== undefined ||
          this.dateCreated !== undefined);
};

Task.prototype.toString = function() {
  return util.format("file:%s, line:%d, text:%s, id:%s", this.source.path, this.line, this.text, this.id);
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
Task.prototype.getText = function(opts) {
  var text = this.text;
  if (opts) {
    if (opts.stripDates) {
      text = text.replace(new RegExp(Task.DatesRegExp), "");
      text = text.replace(/due:\S+/g, "");
    }
    if (opts.stripMeta) text = text.replace(new RegExp(Task.MetaRegExp), "");
    if (opts.stripTags) text = text.replace(new RegExp(Task.TagsRegExp), "");
  }
  return text;
};

/**
 * Description
 * @method getHtml
 * @return MemberExpression
 */
Task.prototype.getHtml = function(opts) {
  return marked(this.getText(opts));
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