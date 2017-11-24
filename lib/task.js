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
function Task(obj, dontParse) {
  if (!(_.isObject(obj))) throw new Error("obj must be an Object");
  this.text = obj.text;
  this.list = obj.list;
  this.order = obj.order;
  this.hasColon = obj.hasColon;
  this.line = obj.line;
  this.id = obj.id;
  this.repoId = obj.repoId;
  this.source = obj.source;
  this.type = obj.type;
  this.dateCreated = obj.dateCreated || undefined;
  this.dateDue = obj.dateDue || undefined;
  this.dateCompleted = obj.dateCompleted || undefined;
  this.tags = obj.tags || [];
  this.context = obj.context || [];
  this.meta = obj.meta || {};
  if (dontParse) return;
  this.parseTodoTxt();
}

Task.Types = {
  CODE: "CODE",
  HASHTAG: "HASHTAG",
  MARKDOWN: "MARKDOWN"
};

Task.TagsRegExp = /(^|\s)\+(\S+)/gi;
Task.getTags = function(text) {
  var tags, result, re = new RegExp(Task.TagsRegExp);

  while ((result = re.exec(text)) !== null) {
    if (!tags) tags = [];
    tags.push(result[2]);
  }

  return tags;
};

Task.ContextRegExp = /(^|\s)\@(\S+)/gi;
Task.getContext = function(text) {
  var context, result, re = new RegExp(Task.ContextRegExp);

  while ((result = re.exec(text)) !== null) {
    if (!context) context = [];
    context.push(result[2]);
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
  var meta = {};
  var result, re = new RegExp(Task.MetaRegExp);
  while((result = re.exec(text)) !== null) {
    var key = result[1];
    if (/[\(<]{1}(http|ssh|ftp|git)/.test(key)) continue;
    if (!/^[^$][^\s\.]+$/.test(key)) continue;
    var val = result[2];
    if (!meta[key]) meta[key] = [];
    meta[key].push(val);
  }

  return meta;
};

Task.prototype.parseTodoTxt = function() {
  // #BACKLOG: #hashtags should be treated like todo.txt tags +enhancement gh:78 id:4
  this.tags = Task.getTags(this.text);
  this.context = Task.getContext(this.text);
  this.meta = Task.getMetaData(this.text);
  if (this.meta && this.meta.due && /^\d{4}-\d{2}-\d{2}$/.test(this.meta.due[0])) {
    this.dateDue = this.meta.due[0];
    delete this.meta.due;
  }

  var dates = Task.getDates(this.text);
  if (dates) {
    this.dateCreated = dates.created;
    this.dateCompleted = dates.completed;
  }
};

Task.prototype.updateTodoTxt = function() {
  this.updateTags();
  this.updateContext();
  this.updateMetaData();
  this.updateDates();
};

Task.prototype.updateTags = function() {
  // TODO: implement updateTags id:7 gh:93
  var self = this;
  var tags = Task.getTags(this.text);
  if (this.getTags()) {
    this.getTags().forEach(function(tag) {
      if (!_.contains(tags, tag)) self.text += util.format(" +%s", tag);
    });
  }
  // TODO: We should also remove stuff id:0 gh:86
};

Task.prototype.updateContext = function() {
  // TODO: implement updateContext id:1
  var self = this;
  var contexts = Task.getContext(this.text);
  if (this.getContext()) {
    this.getContext().forEach(function(context) {
      if (!_.contains(contexts, context)) self.text += util.format(" @%s", context);
    });
  }
  // TODO: We should also remove stuff id:10 gh:95
};

// Update task text with metadata
Task.prototype.updateMetaData = function() {
  var self = this;
  var metaFromText = Task.getMetaData(this.text);
  var meta = this.getMetaData();
  if (meta) {
    _.forEach(meta, function(values, key) {
      if (!metaFromText || !metaFromText[key]) {
        values.forEach(function(val) {
          self.text += util.format(" %s:%s", key, val);
        });
      }
    });
  }
  // TODO: We should also remove stuff to allow removal of id's when deactivating id:13 gh:98
  if (metaFromText) {
    _.forEach(metaFromText, function(values, key) {
      if (!meta || !meta[key]) {
        values.forEach(function(val) {
          self.text = self.text.replace(util.format(" %s:%s", key, val), "");
        });
      }
    });
  }
  // Loop through meta and replace with "" if not in getMetaData
};

Task.prototype.updateDates = function() {
  // TODO: Implement updateDates includeing due id:16 gh:101
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

Task.prototype.removeMetaData = function(key, val) {
  if (val && this.meta[key]) this.meta[key] = _.without(this.meta[key], val.toString());
  else delete this.meta[key];
  val = val || "(?!\\/\\/)(\\S+)";
  var re = new RegExp(key + ":" + val + "\\s?", "g");
  this.text = this.text.replace(re, "");
  this.text = this.text.trim();
};

Task.prototype.addMetaData = function(key, val) {
  if (Array.isArray(val)) {
    var self = this;
    val.forEach(function(val) {
      self._addMetaData(key, val);
    });
  } else {
    this._addMetaData(key, val);
  }
};

Task.prototype._addMetaData = function(key, val) {
  if (!this.meta) this.meta = {};
  if (!this.meta[key]) this.meta[key] = [];
  val = val.toString();
  this.meta[key].push(val);
  this.text += util.format(" %s:%s", key, val);
};

/**
 * Returns metadata as list with links
 * @method getMetaDataWithLinks
 * @param {} repository config
 * @return Array
 */
Task.prototype.getMetaDataWithLinks = function(config) {
  var self = this;
  var meta = [];
  var metaData = this.getMetaData();
  if (metaData) {
    Object.getOwnPropertyNames(metaData).sort().forEach(function(metaKey) {
      var valList = metaData[metaKey];
      valList.forEach(function(value) {
        meta.push({
          key: metaKey,
          value: value,
          link: self.getMetaLink(config, metaKey, value)
        });
      });
    });
  }

  return meta;
};

Task.prototype.getMetaLink = function(config, metaKey, metaValue) {
  var metaConfig = config.meta && config.meta[metaKey];
  if (!metaConfig || !metaValue) return;
  return {
    title: util.format(metaConfig.titleTemplate, metaValue),
    url: util.format(metaConfig.urlTemplate, metaValue),
    icon: metaConfig.icon
  };
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
    if (opts.stripContext) text = text.replace(new RegExp(Task.ContextRegExp), "");
  }
  return text;
};

/**
 * Description
 * @method getHtml
 * @return MemberExpression
 */
Task.prototype.getHtml = function(opts) {
  return marked(this.getText(opts), opts);
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
  if (!task) return;
  return task.getRepoId() == this.getRepoId() &&
         task.getSource().path == this.getSource().path &&
         task.getId() == this.getId();
};

module.exports = Task;
