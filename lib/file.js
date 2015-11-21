'use strict';

var _         = require("lodash"),
    os        = require('os'),
    crypto    = require("crypto"),
    events    = require('events'),
    util      = require('util'),
    path      = require('path'),
    marked    = require('marked'),
    tools     = require('./tools'),
    log       = require('debug')('imdone-core:File'),
    Task      = require('./task');

var ERRORS = {
  NOT_A_TASK: "task must be of type Task"
};

function escapeRegExp(value) {
  return value.replace(/[\/\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

/**
 * Description
 * @method File
 * @param {} repoId
 * @param {} filePath
 * @param {} content
 * @param {} modifiedTime
 * @return
 */
function File(opts) {
  events.EventEmitter.call(this);
  if (_.isObject(opts.file)) {
    _.assign(this, opts.file);
    _.each(this.tasks, function(task) {
      task = new Task(task);
    });
  } else {
    this.repoId = opts.repoId;
    this.path = opts.filePath;
    this.content = opts.content;
    this.modifiedTime = opts.modifiedTime;
    this.languages = opts.languages;
    this.modified = false;
    this.tasks = [];
    this.isDir = false;
  }
}
util.inherits(File, events.EventEmitter);

var LINK_STYLE_REGEX = File.LINK_STYLE_REGEX = /\[(.+?)\]\(#([\w\-]+?):(\d+?\.?\d*?)\)/gm;
var CODE_BLOCK_REGEX = File.CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm;
var INLINE_CODE_REGEX = File.INLINE_CODE_REGEX = /`[\s\S]*?`/g;
var CODE_STYLE_PATTERN = File.CODE_STYLE_PATTERN = "([A-Z]{2,}):?(\\d+?\\.?\\d*?)?\\s+(.*)$";
var HASH_STYLE_REGEX = File.HASH_STYLE_REGEX = /#([\w\-]+?):(\d+?\.?\d*?)\s+(.*)$/gm;

var getTaskId = File.getTaskId = function(path, line, text) {
  var shasum = crypto.createHash('sha1');
  shasum.update(path + "|" + line + "|" + text);
  return shasum.digest('hex');
};

/**
 * Description
 * @method isFile
 * @param {} file
 * @return BinaryExpression
 */
File.isFile = function(file) {
  return file instanceof File;
};

/**
 * Description
 * @method toJSON
 * @return CallExpression
 */
File.prototype.toJSON = function() {
  return _.omit(this, ["domain", "_events", "_maxListeners"]);
};

/**
 * Description
 * @method getRepoId
 * @return MemberExpression
 */
File.prototype.getRepoId = function() {
  return this.repoId;
};

/**
 * Description
 * @method getPath
 * @return MemberExpression
 */
File.prototype.getPath = function() {
  return this.path;
};

/**
 * Description
 * @method getId
 * @return CallExpression
 */
File.prototype.getId = function() {
  return this.getPath();
};

/**
 * Description
 * @method setContent
 * @param {} content
 * @return ThisExpression
 */
File.prototype.setContent = function(content) {
  this.content = content;
  return this;
};

/**
 * Description
 * @method getContent
 * @return MemberExpression
 */
File.prototype.getContent = function() {
  return this.content;
};

/**
 * Description
 * @method setModifiedTime
 * @param {} modifiedTime
 * @return ThisExpression
 */
File.prototype.setModifiedTime = function(modifiedTime) {
  this.modifiedTime = modifiedTime;
  return this;
};

/**
 * Description
 * @method getModifiedTime
 * @return MemberExpression
 */
File.prototype.getModifiedTime = function() {
  return this.modifiedTime;
};

/**
 * Description
 * @method setModified
 * @param {} modified
 * @return ThisExpression
 */
File.prototype.setModified = function(modified) {
  this.modified = modified;
  return this;
};

/**
 * Description
 * @method isModified
 * @return MemberExpression
 */
File.prototype.isModified = function() {
  return this.modified;
};

/**
 * Description
 * @method getType
 * @return MemberExpression
 */
File.prototype.getType = function() {
  return this.constructor.name;
};

/**
 * Description
 * @method getTasks
 * @return MemberExpression
 */
File.prototype.getTasks = function() {
  return this.tasks;
};

/**
 * Description
 * @method getTask
 * @param {} id
 * @return MemberExpression
 */
File.prototype.getTask = function(id) {
  return _.find(this.getTasks(), {id:id});
};

/**
 * Description
 * @method addTask
 * @param {} task
 * @return MemberExpression
 */
File.prototype.addTask = function(task) {
  if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK);
  if (!_.isArray(this.tasks)) this.tasks = [];
  var index = _.findIndex(this.tasks, {id:task.id});
  log("Adding task with text:%s in list:%s with order:%d at index %d", task.text, task.list, task.order, index);
  if (index > -1) {
    this.tasks[index] = task;
  } else {
    this.tasks.push(task);
  }
  return this;
};

File.prototype.removeTask = function(task) {
  if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK);
  if (!_.isArray(this.tasks)) this.tasks = [];
  var index = _.findIndex(this.tasks, {id:task.id});
  if (index > -1) {
    this.tasks.splice(index,1);
  }
};

/**
 * Description
 * @method ignoreCodeBlocks
 * @return cleanContent
 */
File.prototype.ignoreCodeBlocks = function() {
  var cleanContent = this.content;
  var replacer = function(block) {
    block = block.replace(new RegExp(LINK_STYLE_REGEX), "**TASK**");
    block = block.replace(new RegExp(HASH_STYLE_REGEX), "**TASK**");
    return block;
  };

  if (this.isMarkDownFile()) {
    cleanContent = this.content.replace(new RegExp(CODE_BLOCK_REGEX), replacer)
                               .replace(new RegExp(INLINE_CODE_REGEX), replacer);
  }
  return cleanContent;
};

/**
 * Description
 * @method isMarkDownFile
 * @return LogicalExpression
 */
File.prototype.isMarkDownFile = function() {
  var lang = this.getLang();
  return (lang && (lang.name === "markdown"));
};

/**
 * Description
 * @method getLang
 * @return LogicalExpression
 */
File.prototype.getLang = function() {
  // #ARCHIVE:20 Allow a project to extend languages by adding them to config.json gh-iss:5
  var lang = this.languages[path.extname(this.path)];
  return lang || {name:"text",symbol:""};
};

/**
 * Description
 * @method getExt
 * @return CallExpression
 */
File.prototype.getExt = function() {
  return path.extname(this.path).substring(1);
};

File.prototype.isCodeFile = function() {
  var symbol = this.getLang().symbol;
  return (symbol && symbol !== "");
};

File.prototype.newTask = function(list, text, order, line, type) {
  var self = this;
  text = self.trimCodeBlockEnd(text);
  var task = new Task({
    text: text,
    list: list,
    order: order,
    line: line,
    id: getTaskId(self.getPath(), line, text),
    repoId: self.getRepoId(),
    source: self.getSource(),
    type: type
  });
  return task;
};

File.prototype.getCodeCommentRegex = function() {
  // TODO:0 Allow languages to have multiple block comment styles, like html gh-iss:13
  var lang = this.getLang();
  var symbol = lang.symbol;
  var reString = escapeRegExp(symbol) + ".*$";

  if (lang.block) {
    var start = escapeRegExp(lang.block.start);
    var end = escapeRegExp(lang.block.end);
    //
    reString = reString + "|" + start + "(.|[\r\n])*?" + end;
  }

  return new RegExp(reString, "gmi");
};

File.prototype.trimCodeBlockEnd = function(text) {
  if (this.isCodeFile() && this.getLang().block) {
    var endPattern = escapeRegExp(this.getLang().block.end) + ".*$";
    return text.replace(new RegExp(endPattern), "");
  }
  return text;
};

File.prototype.extractCodeStyleTasks = function(config, pos, content) {
  var self = this;
  var codeStyleRegex = new RegExp(CODE_STYLE_PATTERN, "gm");
  var result;
  while((result = codeStyleRegex.exec(content)) !== null) {
    var posInContent = result.index+pos;
    var charBeforeList = this.getContent().substring(posInContent-1, posInContent);
    if (charBeforeList !== "#") {
      var list = result[1];
      if (config && !config.includeList(list)) return; // #BACKLOG:20 Save all lists found so we can present them to the user
      var rawTask = result[0];
      var order = (result[2] === undefined) ? 0 : parseFloat(result[2]);
      var text = result[3];
      var line = this.getLineNumber(posInContent);
      var task = self.newTask(list, text, order, line, Task.Types.CODE);
      self.addTask(task);
      self.emit("task.found", task);
    }
  }
};

File.prototype.extractHashStyleTasks = function(pos, content) {
  var self = this;
  var hashStyleRegex = new RegExp(HASH_STYLE_REGEX);
  var result;
  while((result = hashStyleRegex.exec(content)) !== null) {
    var list = result[1];
    var rawTask = result[0];
    var order = (result[2] === undefined) ? 0 : parseFloat(result[2]);
    var text = result[3];
    var line = this.getLineNumber(result.index + pos);
    var task = this.newTask(list, text, order, line, Task.Types.HASHTAG);
    self.addTask(task);
    self.emit("task.found", task);
  }
};

File.prototype.extractLinkStyleTasks = function(pos, content) {
  var self = this;
  var linkStyleRegex = new RegExp(LINK_STYLE_REGEX);
  var result;
  while((result = linkStyleRegex.exec(content)) !== null) {
    var list = result[2];
    var rawTask = result[0];
    var order = (result[3] === undefined) ? 0 : parseFloat(result[3]);
    var text = result[1];
    var line = this.getLineNumber(result.index + pos);
    log("*********************************************************");
    log("list:%s text:%s order:%d line:%d", list, text, order, line);
    var task = self.newTask(list, text, order, line, Task.Types.MARKDOWN);
    self.addTask(task);
    self.emit("task.found", task);
  }
};

File.prototype.extractTasksInCodeFile = function(config) {
  var self = this;
  var commentRegex = this.getCodeCommentRegex();
  var result;
  while ((result = commentRegex.exec(self.getContent())) !== null) {
    var comment = result[0];
    var commentStart = result.index;
    self.extractHashStyleTasks(commentStart, comment);
    self.extractLinkStyleTasks(commentStart, comment);
    self.extractCodeStyleTasks(config, commentStart, comment);
  }
};

File.prototype.extractTasksInNonCodeFile = function() {
  this.extractHashStyleTasks(0, this.getContent());
  this.extractLinkStyleTasks(0, this.getContent());
};

File.hasWindowsEOL = function(content) {
  return /\r\n/.test(content);
};

File.getUnixContent = function(content) {
  return content.replace(/\r\n|\r/g, "\n");
};

File.prototype.getLinePos = function(lineNo) {
  var re = /^/gm;
  var line = 1;
  var content = File.getUnixContent(this.getContent());
  var result;
  while ((result = re.exec(content)) !== null) {
    if (line == lineNo) {
      return (File.hasWindowsEOL(this.getContent())) ? result.index + line-1 : result.index;
    }
    if (result.index === re.lastIndex) re.lastIndex++;
    line++;
  }
};

// #ARCHIVE:10 This is not working on some files (Created in windows)
File.getLineNumber = function(content, pos) {
  var unixContent = File.getUnixContent(content);
  var extraChars = (File.hasWindowsEOL(content)) ? 1 : 0;
  var lines = unixContent.split(/^/gm);
  var len = 0;
  for (var i = 0; i < lines.length; i++) {
    len = len + lines[i].length + extraChars;
    if (len > pos) return i+1;
  }
};

File.prototype.getLineNumber = function(pos) {
  return File.getLineNumber(this.getContent(), pos);
};

File.prototype.modifyTask = function(task) {
  var self = this;
  if (task.type === Task.Types.CODE) {
    this.modifyCodeOrHashTask(new RegExp(CODE_STYLE_PATTERN, "gm"), task);
  } else if (task.type === Task.Types.HASHTAG) {
    this.modifyCodeOrHashTask(HASH_STYLE_REGEX, task);
  } else if (task.type === Task.Types.MARKDOWN) {
    this.modifyLinkTask(task);
  }
};

File.prototype.modifyCodeOrHashTask = function(re, task) {
  var log = require('debug')('modify-task:modifyCodeOrHashTask');
  log('In modifyCodeOrHashTask:%j', task);
  var self = this;
  var line = task.getLine();
  re = new RegExp(re);
  re.lastIndex = this.getLinePos(line);
  var result = re.exec(this.getContent());
  if (result) {
    log('Got result: %j', result);
    var rawTask = result[0];
    var list = result[1];
    var text = result[3];
    var taskText = this.trimCodeBlockEnd(text);
    if (task.id == getTaskId(self.getPath(), line, taskText)) {
      var index = result.index;
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, index);
      var afterContent = this.getContent().substring(re.lastIndex);
      var lang = this.getLang();
      if (lang && lang.block && lang.block.end) {
        var blockEnd = text.indexOf(lang.block.end);
        if (blockEnd > -1) {
          text = task.text + text.substring(blockEnd);
        } else text = task.text;
      } else text = task.text;
      var hash = task.type === Task.Types.HASHTAG ? "#" : "";
      var taskContent = util.format("%s%s:%d %s", hash, task.list, task.order, text);
      this.setContent(beforeContent + taskContent + afterContent);
      this.setModified(true);
      // task.type = Task.Types.HASHTAG;
      this.removeTask(task);
      task.id = getTaskId(self.getPath(), task.line, task.text);
      this.addTask(task);
      this.emit("task.modified", task);
      this.emit("file.modified", self);
    }
  }

  return this;
};

// #ARCHIVE:40 This is a problem
File.prototype.modifyLinkTask = function(task) {
  var log = require('debug')('modify-task:modifyLinkTask');
  log('In modifyLinkTask');
  var self = this;
  var line = task.getLine();
  var re = new RegExp(LINK_STYLE_REGEX);
  log('re:%s', re);
  var pos = this.getLinePos(line);
  re.lastIndex = pos;
  var result;
  var content = self.getContent();
  while ((result = re.exec(content)) !== null) {
    log('Got result: %j', result);
    var rawTask = result[0];
    var rawTaskStart = pos + result.index;
    var text = result[1];
    if (task.id == getTaskId(self.getPath(),line, text)) {
      var beforeContent = this.getContent().substring(0, result.index);
      var afterContent = this.getContent().substring(re.lastIndex);
      var taskContent = util.format("[%s](#%s:%d)", task.text, task.list, task.order);
      this.setContent(beforeContent + taskContent + afterContent);
      this.removeTask(task);
      this.setModified(true);
      this.addTask(task);
      task.id = getTaskId(self.getPath(), task.line, task.text);
      this.emit("task.modified", task);
      this.emit("file.modified", self);
      return this;
    }
  }

  return this;
};

// [Implement #listname style tasks in any text file](#ARCHIVE:160)
// [Allow code style tasks to be included on list name](#ARCHIVE:150)
/**
 * Description
 * @method extractTasks
 * @return ThisExpression
 */
// #ARCHIVE:60 Have a seperate extract and modify method for code files and only look in comments and block comments
File.prototype.extractTasks = function(config) {
  this.tasks = [];
  if (this.isCodeFile()) {
    this.extractTasksInCodeFile(config);
  } else {
    this.extractTasksInNonCodeFile();
  }
  return this;
};
/**
 * Get html for markdown file
 * @method md
 * @param {} opts - The marked opts
 * @param Function cb
 */
 File.prototype.md = function(opts, cb) {
  if (!this.getContent()) throw new Error("Load content with Repository.readFileContent");
  cb = tools.cb(cb);
  var content = this.getContent().replace(new RegExp(HASH_STYLE_REGEX), function(md, list, order, text, pos) {
    order = (order === undefined) ? "0" : order;
    return util.format(" [%s](#%s:%s)", text, list, order);
  });
  marked(content, opts, cb);
};

/**
 * Description
 * @method getSource
 * @return ObjectExpression
 */
File.prototype.getSource = function() {
  var self = this;
  return {
    path: self.getPath(),
    id: self.getId(),
    repoId: self.getRepoId(),
    type: self.getType(),
    ext: self.getExt(),
    lang: self.getLang().name,
    modified: self.isModified(),
    modifiedTime: self.getModifiedTime()
  };
};


module.exports = File;
