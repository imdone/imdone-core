'use strict';

var _         = require("lodash"),
    crypto    = require("crypto"),
    events    = require('events'),
    util      = require('util'),
    path      = require('path'),
    languages = require('./languages'),
    marked    = require('marked'),
    tools     = require('./tools'),
    log       = require('debug')('imdone-core:File'),    
    Task      = require('./task');

var ERRORS = {
  NOT_A_TASK: "task must be of type Task"
};

var LINK_STYLE_REGEX = /\[(.+?)\]\(#([\w\-]+?):(\d+?\.?\d*?)\)/g;
var CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm;
var INLINE_CODE_REGEX = /`[\s\S]*?`/g;
var CODE_STYLE_PATTERN = "([A-Z]{2,}):?(\\d+?\\.?\\d*?)?\\s+(.*)$";
var HASH_STYLE_REGEX = /#([\w\-]+?):(\d+?\.?\d*?)\s+(.*)$/g;

var TASK_TYPE = {
  CODE: 0,
  LINK: 1,
  HASH: 2
};

function escapeRegExp(value) {
  return value.replace(/[\/\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

function getTaskId(line, text) {
  var shasum = crypto.createHash('sha1');
  shasum.update(line + "|" + text);
  return shasum.digest('hex');
}

function getLineNumber(content, pos) {
  var lb = content.substring(0,pos).match(/\n/g);
  return (lb||[]).length + 1;  
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
function File(repoId, filePath, content, modifiedTime) {
  events.EventEmitter.call(this);
  if (_.isObject(repoId)) {
    _.assign(this, repoId);
    _.each(this.tasks, function(task) {
      task = new Task(task);
    });
  } else {
    this.repoId = repoId;
    this.path = filePath;
    this.content = content;
    this.modifiedTime = modifiedTime;
    this.modified = false;
    this.tasks = [];
    this.isDir = false;
  }
}

util.inherits(File, events.EventEmitter);

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
  return this.getTasks()[id];
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
  if (index > -1) {
    this.tasks[index] = task;
  } else {
    this.tasks.push(task);
  }
  return this.tasks;    
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
  var lang = languages[path.extname(this.path)];
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

/**
 * Description
 * @method getCodeStyleRegex
 * @return 
 */
// TODO:0 Remove
File.prototype.getCodeStyleRegex = function() {
  if (this.isCodeFile()) {
    var symbol = this.getLang().symbol;
    symbol.replace("/", "\\/");
    var defactoPattern = "^(.*" + symbol + "\\s*)" + CODE_STYLE_PATTERN;
    return new RegExp(defactoPattern, "mg");
  }
};
File.prototype.newTask = function(list, text, order, line, type) {
  var self = this;
  var task = new Task({
    text:text,
    html:marked(text),
    list: list,
    order: order,
    line: line,
    id: getTaskId(line, text),
    repoId: self.getRepoId(),
    source: self.getSource(),
    type: type
  });
  return task;
};

File.prototype.getCodeCommentRegex = function() {
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

File.prototype.extractCodeStyleTasks = function(config, pos, content) {
  var self = this;
  var codeStyleRegex = new RegExp(CODE_STYLE_PATTERN, "gm");
  var result;
  while((result = codeStyleRegex.exec(content)) !== null) {
    if (this.getContent().substring(result.index-1, result.index) !== "#") {
      var list = result[1];
      if (config && !config.includeList(list)) return;
      var rawTask = result[0];
      var order = (result[2] === undefined) ? 0 : parseFloat(result[2]);
      var text = result[3];
      var line = getLineNumber(this.getContent(), pos);
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
    var line = getLineNumber(this.getContent(), pos);
    var task = self.newTask(list, text, order, line, Task.Types.HASH);
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
    var line = getLineNumber(this.getContent(), result.index);
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

File.prototype.getLinePos = function(line) {
  var lineRegex = /.*\n/gm;
  var result;
  var curLine = 1;
  var log = require('debug')('getLinePos');
  log("file:%s", this.getPath());
  while ((result = lineRegex.exec(this.getContent())) !== null) {
    log('result:%j', result);
    log('result.index:%d', result.index);
    log('line:%d curLine:%d', line, curLine);
    if (curLine === line) return result.index;
    curLine++;
  }

  // DOING return start and end by executing the regex until line is reached 
};

File.prototype.modifyTask = function(task) {
  var self = this;
  if (task.type === Task.Types.CODE) {
    // DOING now replace the whole line with the modified task
    this.modifyCodeOrHashTask(new RegExp(CODE_STYLE_PATTERN, "gm"), task);
  } else if (task.type === Task.Types.HASH) {
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
  log("re:%s",re);
  re.lastIndex = this.getLinePos(line);
  log("re.lastIndex:%d", re.lastIndex);
  var result = re.exec(this.getContent());
  if (result) {
    log('Got result: %j', result);
    var rawTask = result[0];
    var list = result[1];
    var text = result[3];
    log('result taskId:%s', getTaskId(line, text));
    if (task.id == getTaskId(line, text)) {
      log('FoundTask:%j', task);
      var beforeContent = this.getContent().substring(0, result.index);
      var afterContent = this.getContent().substring(re.lastIndex);    
      this.setContent(util.format("%s#%s:%d %s%s", beforeContent, task.list, task.order, task.text, afterContent));
      this.setModified(true);
      this.addTask(task);
      self.emit("task.modified", task);
      self.emit("file.modified", self);
    }
  }

  return this; 
};

File.prototype.modifyLinkTask = function(task) {
  var log = require('debug')('modify-task:modifyLinkTask');
  log('In modifyLinkTask');
  var self = this;
  var line = task.getLine();
  var re = new RegExp(LINK_STYLE_REGEX);
  log('re:%s', re);
  re.lastIndex = this.getLinePos(line);
  var pos = re.lastIndex;
  var result;
  while ((result = re.exec(self.getContent())) !== null) {
    log('Got result: %j', result);
    var rawTask = result[0];
    var rawTaskStart = pos + result.index;
    var text = result[1];
    //if (getLineNumber(self.content, pos) > line) return this;
    if (task.id == getTaskId(line, text)) {
      log('FoundTask:%j', task);
      var beforeContent = this.getContent().substring(0, result.index);
      var afterContent = this.getContent().substring(re.lastIndex);    
      this.setContent(util.format("%s[%s](%s:%d)%s", beforeContent, task.text, task.list, task.order, afterContent));
      this.setModified(true);
      this.addTask(task);
      self.emit("task.modified", task);
      self.emit("file.modified", self);
      return this;
    }
  }

  return this; 
};

// [Implement #listname style tasks in any text file](#archive:30)
// [Allow code style tasks to be included on list name](#archive:10)
/**
 * Description
 * @method extractTasks
 * @return ThisExpression
 */
// DOING:0 Have a seperate extract and modify method for code files and only look in comments and block comments
File.prototype.extractTasks = function(config) {
  if (this.isCodeFile()) {
    this.extractTasksInCodeFile(config);
  } else {
    this.extractTasksInNonCodeFile();
  }
  return this;
};

/**
 * Description
 * @method modifyTask
 * @param {} task
 * @return this for chaining
 */
// File.prototype.modifyTask = function(task, config) {
//   var self = this, modified = false;
//   var codeStyleRegex = this.getCodeStyleRegex();
//   var log = require('debug')('modifyTask');

//   var codeCommentReplacer = function(match, start, list, order, text, pos) {
//     // if (config && !config.includeList(list)) return match;
//     var line = getLineNumber(self.content, pos);
//     var id = getTaskId(line, text);
//     var newText = match;
//     if (id === task.id) {
//       log("Modifying task in code:%j", task);
//       // if the new list is not all upercase use HASH style
//       if (/[A-Z]+/.test(task.list) && config && config.includeList(list)) {
//         newText = self.taskText(start, text, task.list, task.order, TASK_TYPE.CODE);
//       } else {
//         newText = self.taskText(start, text, task.list, task.order, TASK_TYPE.HASH);
//         task.type = Task.Types.HASHTAG;
//       }
//       log(newText);
//       modified = true;
//     } 
//     return newText;
//   };

//   if (codeStyleRegex) this.content = this.content.replace(codeStyleRegex, codeCommentReplacer); 

//   if (this.getLang().block) {
//     var lang = this.getLang();
//     var block = lang.block;
//     var symbol = lang.symbol;
//     var start = escapeRegExp(block.start);
//     var end = escapeRegExp(block.end);
//     var ignore = escapeRegExp(block.ignore);
//     var regex = new RegExp(start + "([\\s\\S]*?)" + end, "mg");
//     var blockPattern = "(.*?)" + CODE_STYLE_PATTERN;
//     this.content = this.content.replace(regex, function(match, block) {
//       return match.replace(new RegExp(blockPattern, "gm"), codeCommentReplacer);
//     });
//   }
  
//   this.content = this.content.replace(new RegExp(LINK_STYLE_REGEX), function(md, text, list, order, pos) {
//     if (!self.isValidTask(self.content, pos)) {
//       return md;
//     }
//     var line = getLineNumber(self.content, pos);
//     var id = getTaskId(line, text);
//     var newMD = md;
//     if (id === task.id) {
//       log("Modifying link style task:%j", task);
//       newMD = self.taskText("", text, task.list, task.order, TASK_TYPE.LINK);
//       modified = true;
//     } 
//     return newMD;
//   });

//   this.content = this.content.replace(new RegExp(HASH_STYLE_REGEX), function(md, list, order, text, pos) {
//     if (!self.isValidTask(self.content, pos)) {
//       return md;
//     }
//     var line = getLineNumber(self.content, pos);
//     var id = getTaskId(line, text);
//     var newMD = md;
//     if (id === task.id) {
//       log("Modifying hash style task:%j", task);
//       newMD = self.taskText("", text, task.list, task.order, TASK_TYPE.HASH);
//       modified = true;
//     } 
//     return newMD;
//   });

//   if (modified) {
//     this.setModified(true);
//     this.addTask(task);
//     self.emit("task.modified", task);
//     self.emit("file.modified", self);
//   }

//   return this;
// };

/**
 * Description
 * @method taskText
 * @param {} start
 * @param {} text
 * @param {} list
 * @param {} order
 * @param Number TASK_TYPE
 * @return BinaryExpression
 */
// File.prototype.taskText = function(start, text, list, order, type) {
//   if (type === TASK_TYPE.CODE) return start + list + ":" + order + " " + text;
//   if (type === TASK_TYPE.LINK) return start + "[" + text + "](#" + list + ":" + order + ")";
//   if (type === TASK_TYPE.HASH) return start + "#" + list + ":" + order + " " + text;
// };

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