'use strict';

var _      = require('lodash'),
    util   = require('util'),
    os     = require('os'),
    cheerio = require('cheerio'),
    marked = require('./tools').marked;

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
  this.tags = obj.tags || [];
  this.context = obj.context || [];
  this.meta = obj.meta || {};
  this.description = obj.description || [];
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

Task.MetaRegExp = /(\w+?):(?!\/\/)(\S+)/g;
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
};

Task.prototype.updateTodoTxt = function() {
  this.updateTags();
  this.updateContext();
  this.updateMetaData();
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
  // TODO: implement updateContext id:1 gh:124
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
  let re = new RegExp(Task.MetaRegExp)
  this.text = this.text.replace(re, "").replace(/\s+/g, " ").trim()
  var meta = this.getMetaData()
  if (meta) {
    _.forEach(meta, (values, key) => {
      _.uniq(values).forEach((val) => {
        this.text += ` ${key}:${val}`
      })
    })
  }
}

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

Task.prototype.hasMetaData = function(key, value) {
  var meta = this.meta[key];
  if (!meta) return false;
  if (_.isArray(value)) return _.isEqual(value.sort() ,meta.sort());
  return meta.includes(value);
};

Task.prototype.removeMetaData = function(key, val) {
  if (val && this.meta[key]) this.meta[key] = _.without(this.meta[key], val.toString());
  else delete this.meta[key];
  this.updateMetaData()
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
  this.updateMetaData()
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
    if (opts.stripMeta) text = text.replace(new RegExp(Task.MetaRegExp), "");
    if (opts.stripTags) text = text.replace(new RegExp(Task.TagsRegExp), "");
    if (opts.stripContext) text = text.replace(new RegExp(Task.ContextRegExp), "");
  }
  return text;
};

Task.prototype.getTextAndDescription = function(opts) {
  let text = this.getText(opts);
  if (!this.description || this.description.length === 0) return text
  return text + os.EOL + this.description.join(os.EOL);
}

/**
 * Description
 * @method getHtml
 * @return Html task
 */
Task.prototype.getHtml = function(opts) {
  let taskHtml = marked(this.getText(opts), opts);
  let $ = cheerio.load(`<div class="task-line">${taskHtml}</div>`);
  if (!this.description || this.description.length === 0) return $.html();

  let descHtml = marked(this.description.join(os.EOL));
  $ = cheerio.load(`${$.html()}<div class="task-description">${descHtml}</div>`);
  $('.task-description ul').find("input[type='checkbox']").addClass('checklist-item').closest('ul').addClass('checklist');
  return $.html();
};

Task.prototype.getChecksFromHtml = function(html) {
  let $ = cheerio.load(html);
  let checks = $('.task-description').find("input[type='checkbox']");
  const result = [];
  checks.each(function () {
    result.push($(this).is(':checked'));
  })
  return result;
}

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
