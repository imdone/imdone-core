'use strict';

var _         = require("lodash"),
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
var HASH_STYLE_REGEX = /#([\w\-]+?):(\d+?\.?\d*?)\s+(.*)/g;

var TASK_TYPE = {
  CODE: 0,
  LINK: 1,
  HASH: 2
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
 * @method isValidTask
 * @param {} data
 * @param {} pos
 * @return valid
 */
File.prototype.isValidTask = function(data, pos) {
  var done = false, 
    beforeTask = "",
    valid = false,
    lang = this.getLang(),
    symbol = lang.symbol,
    symbolRegex = new RegExp(symbol);

  log('checking for valid task with regex:%s', symbolRegex);

  if (lang && symbol) {
    for(var i=pos-1; !done; i--) {
      beforeTask = data.substring(i,pos);
      if (/\n/.test(beforeTask)) {
        done = true;
      } else if (symbolRegex.test(beforeTask)) {
        done = true;
        valid = true;
      }
    }
  } else {
    valid = true;
  }
  
  log('valid:%s', valid);
  return valid;
};

function replacer(block) {
  block = block.replace(new RegExp(LINK_STYLE_REGEX), "**TASK**");
  block = block.replace(new RegExp(HASH_STYLE_REGEX), "**TASK**");
  return block;
}
/**
 * Description
 * @method ignoreCode
 * @return cleanContent
 */
File.prototype.ignoreCode = function() {
  var cleanContent = this.content;
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

/**
 * Description
 * @method getCodeStyleRegex
 * @return 
 */
File.prototype.getCodeStyleRegex = function() {
  var symbol = this.getLang().symbol;
  if (symbol && symbol !== "") {
    symbol.replace("/", "\\/");
    var defactoPattern = "^(.*" + symbol + "\\s*)" + CODE_STYLE_PATTERN;
    return new RegExp(defactoPattern, "mg");
  }
};

File.prototype.getTasksInCode = function(content, id, config) {
  var self = this;
  var extractor = function(match, start, list, order, text, pos) {
    if (config && !config.includeList(list)) return;
    log("Found a CODE_STYLE_PATTERN task: list:%s, order:%s, text:%s, pos:%d", list, order, text, pos);
    if ((text.toUpperCase() == text) || (text.replace(" ", "") === "")) return;
    order = (order === undefined) ? 0 : parseFloat(order);
    var lb = content.substring(0,pos).match(/\n/g);
    var line = (lb||[]).length + 1;
    var task = new Task({
      codeStyle: true,
      text:text,
      html:marked(text),
      list: list,
      order: order,
      line: line,
      id: id,
      repoId: self.getRepoId(),
      source: self.getSource(),
      type: Task.Types.CODE
    });

    self.addTask(task);
    self.emit("task.found", task);
    id++;
  };

  // Look for single line comments
  var codeStyleRegex = this.getCodeStyleRegex();
  if (codeStyleRegex) content.replace(codeStyleRegex, extractor);

  // [Now we need to look for multi-line comments](#archive:20)
  if (this.getLang().block) {
    var lang = this.getLang();
    var block = lang.block;
    var symbol = lang.symbol;
    var start = escapeRegExp(block.start);
    var end = escapeRegExp(block.end);
    var ignore = escapeRegExp(block.ignore);
    var regex = new RegExp(start + "([\\s\\S]*?)" + end, "mg");
    log('Using RegExp %s to find block comments', regex.toString());
    // var blockPattern = "^([\\s|" + start + "|" + ignore + "]*?" + CODE_STYLE_PATTERN;
    var blockPattern = "(.*?)" + CODE_STYLE_PATTERN;
    content.replace(regex, function(match, block, pos) {
      log('Using RegExp %s to find tasks in %s', blockPattern.toString(), block);
      block.replace(new RegExp(blockPattern, "gm"), function(match, start, list, order, text, posInBlock) {
        extractor(match, start, list, order, text, pos+posInBlock+1);
      });
    });
  }

  return id;
};

// [Implement #listname style tasks in any text file](#archive:30)
// [Allow code style tasks to be included on list name](#archive:10)
/**
 * Description
 * @method extractTasks
 * @return ThisExpression
 */
File.prototype.extractTasks = function(config) {
  var self = this;
  var id = 0;
  var clone = this.ignoreCode();
  this.tasks = [];
  // [Store task type in task , so we know how to remove the task later](#archive:0)
  // Check for codestyle tasks
  this.getTasksInCode(clone, id, config);

  clone.replace(new RegExp(LINK_STYLE_REGEX), function(md, text, list, order, pos) {
    log("Found a LINK_STYLE_REGEX task: list:%s, order:%s, text:%s, pos:%d", list, order, text, pos);
    if (self.isValidTask(clone, pos)) {
      var lb = clone.substring(0,pos).match(/\n/g);
      var line = (lb||[]).length + 1;
      var task = new Task({
        text:text,
        html:marked(text),
        list: list,
        order: parseFloat(order),
        line: line,
        id: id,
        repoId: self.getRepoId(),
        source: self.getSource(),
        type: Task.Types.MARKDOWN
      });

      self.addTask(task);
      self.emit("task.found", task);
      id++;
    }
  });

  clone.replace(new RegExp(HASH_STYLE_REGEX), function(md, list, order, text, pos) {
    log("Found a HASH_STYLE_REGEX task: list:%s, order:%s, text:%s, pos:%d", list, order, text, pos);
    if (self.isValidTask(clone, pos)) {
      order = (order === undefined) ? 0 : parseFloat(order);
      var lb = clone.substring(0,pos).match(/\n/g);
      var line = (lb||[]).length + 1;
      var task = new Task({
        text:text,
        html:marked(text),
        list: list,
        order: parseFloat(order),
        line: line,
        id: id,
        repoId: self.getRepoId(),
        source: self.getSource(),
        type: Task.Types.HASHTAG
      });

      self.addTask(task);
      self.emit("task.found", task);
      id++;
    }
  });

  this.emit("tasks", this.tasks);
  return this;
};


/**
 * Description
 * @method modifyTask
 * @param {} task
 * @return ThisExpression
 */
File.prototype.modifyTask = function(task, config) {
  var self = this, n = 0, modified = false;
  var codeStyleRegex = this.getCodeStyleRegex();

  var codeCommentReplacer = function(match, start, list, order, text, pos) {
    if (config && !config.includeList(list)) return match;
    var newText = match;
    if (n === task.id) {
      log("Modifying task in code:%j", task);
      log("match: %s", match);
      // if the new list is not all upercase use md style
      if (/[A-Z]+/.test(task.list)) {
        newText = self.taskText(start, text, task.list, task.order, TASK_TYPE.CODE);
      } else {
        newText = self.taskText(start, text, task.list, task.order, TASK_TYPE.LINK);
        delete task.codeStyle;
      }
      log(newText);
      modified = true;
    } 
    n++;
    return newText;
  };

  if (codeStyleRegex) this.content = this.content.replace(codeStyleRegex, codeCommentReplacer); 

  if (this.getLang().block) {
    var lang = this.getLang();
    var block = lang.block;
    var symbol = lang.symbol;
    var start = escapeRegExp(block.start);
    var end = escapeRegExp(block.end);
    var ignore = escapeRegExp(block.ignore);
    var regex = new RegExp(start + "([\\s\\S]*?)" + end, "mg");
    var blockPattern = "(.*?)" + CODE_STYLE_PATTERN;
    this.content = this.content.replace(regex, function(match, block) {
      return match.replace(new RegExp(blockPattern, "gm"), codeCommentReplacer);
    });
  }
  
  this.content = this.content.replace(new RegExp(LINK_STYLE_REGEX), function(md, text, list, order, pos) {
    if (!self.isValidTask(self.content, pos)) {
      return md;
    }

    var newMD = md;
    if (n === task.id) {
      if (/[A-Z]+/.test(task.list) && codeStyleRegex) {
        newMD = self.taskText("", text, task.list, task.order, TASK_TYPE.CODE);
        task.codeStyle = true;
      } else {
        newMD = self.taskText("", text, task.list, task.order, TASK_TYPE.LINK);
      }
      modified = true;
    } 
    n++;
    return newMD;
  });

  this.content = this.content.replace(new RegExp(HASH_STYLE_REGEX), function(md, list, order, text, pos) {
    if (!self.isValidTask(self.content, pos)) {
      return md;
    }

    var newMD = md;
    if (n === task.id) {
      newMD = self.taskText("", text, task.list, task.order, TASK_TYPE.HASH);
      modified = true;
    } 
    n++;
    return newMD;
  });

  if (modified) {
    this.setModified(true);
    this.addTask(task);
    self.emit("task.modified", task);
    self.emit("file.modified", self);
  }

  return this;
};

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
File.prototype.taskText = function(start, text, list, order, type) {
  if (type === TASK_TYPE.CODE) return start + list + ":" + order + " " + text;
  if (type === TASK_TYPE.LINK) return start + "[" + text + "](#" + list + ":" + order + ")";
  if (type === TASK_TYPE.HASH) return start + "#" + list + ":" + order + " " + text;
};

/**
 * Get html for markdown file
 * @method md
 * @param {} opts - The marked opts
 * @param Function cb
 */
 File.prototype.md = function(opts, cb) {
  if (!this.getContent()) throw new Error("Load content with Repository.readFileContent or Repository.readFileContentSync");
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