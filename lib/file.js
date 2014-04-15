var _         = require("lodash"),
    fs        = require('fs'),
    events    = require('events'),
    util      = require('util'),
    path      = require('path'),
    languages = require('./languages'),
    marked    = require('marked'),
    Task      = require('./task');

var ERRORS = {
  NOT_A_TASK: "task must be of type Task"
};

var LINK_STYLE_REGEX = /\[(.+?)\]\(#([\w\-]+?):(\d+?\.?\d*?)\)/g;
var CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm;
var CODE_STYLE_PATTERN = "\\s*)([A-Z]{2,}):?(\\d+?\\.?\\d*?)?\\s+(.*)$";

function File(repoId, filePath, content, modifiedTime) {
  events.EventEmitter.call(this);
  this.repoId = repoId;
  this.path = filePath;
  this.content = content;
  this.modifiedTime = modifiedTime;
  this.modified = false;
  this.tasks = [];
  this.isDir = false;
}

util.inherits(File, events.EventEmitter);

File.isFile = function(file) {
  return file instanceof File;
};

File.prototype.getRepoId = function() {
  return this.repoId;
};

File.prototype.getPath = function() {
  return this.path;
};

File.prototype.getId = function() {
  return this.getPath();
};

File.prototype.setContent = function(content) {
  this.content = content;
  return this;
};

File.prototype.getContent = function() {
  return this.content;
};

File.prototype.setModifiedTime = function(modifiedTime) {
  this.modifiedTime = modifiedTime;
  return this;
};

File.prototype.getModifiedTime = function() {
  return this.modifiedTime;
};

File.prototype.setModified = function(modified) {
  this.modified = modified;
  return this;
};

File.prototype.getModified = function() {
  return this.modified;
};

File.prototype.getType = function() {
  return this.constructor.name;
};

File.prototype.getTasks = function() {
  return this.tasks;
};

File.prototype.addTask = function(task) {
  if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK);
  if (!_.isArray(this.tasks)) this.tasks = [];
  var index = _.findIndex(this.tasks, task.id);
  if (index > -1) {
    this.tasks[index] = task;
  } else {
    this.tasks.push(task);
  }
  return this.tasks;    
};

File.prototype.isValidTask = function(data, pos) {
  var done = false, 
    beforeTask = "",
    valid = false,
    lang = this.getLang(),
    symbol = lang.symbol,
    symbolRegex = new RegExp(symbol);

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
  
  return valid;
};

File.prototype.ignoreCode = function() {
  var cleanContent = this.content;
  if (this.isMarkDownFile()) {
    var regEx = new RegExp(CODE_BLOCK_REGEX);
    cleanContent = this.content.replace(regEx, function(block) {
      return block.replace(new RegExp(LINK_STYLE_REGEX), "**TASK**");
    });
  }
  return cleanContent;
};

File.prototype.isMarkDownFile = function() {
  var lang = this.getLang();
  return (lang && (lang.name === "markdown"));
};

File.prototype.getLang = function() {
  var lang = languages[path.extname(this.path)];
  return lang || {name:"text",symbol:""};
};

File.prototype.getCodeStyleRegex = function() {
  var symbol = this.getLang().symbol;
  if (symbol !== "") {
    symbol.replace("/", "\\/");
    var defactoPattern = "^(\\s*" + symbol + CODE_STYLE_PATTERN;
    return new RegExp(defactoPattern, "mg");
  }
};

// TODO:0 Implement #listname:0 style tasks in any text file
File.prototype.extractTasks = function() {
  var self = this;
  var id = 0;
  var clone = this.ignoreCode();
  this.tasks = [];

  // Check for codestyle tasks
  var codeStyleRegex = this.getCodeStyleRegex();
  if (codeStyleRegex) {
    clone.replace(codeStyleRegex, function(match, start, list, order, text, pos) {
      if ((text.toUpperCase() == text) || (text.replace(" ", "") === "")) return;
      order = (order === undefined) ? 0 : parseFloat(order);
      var line = (clone.substring(0,pos).match(/\n/g)||[]).length + 1;
      var task = new Task({
        codeStyle: true,
        text:text,
        html:marked(text),
        list: list,
        order: order,
        line: line,
        id: id,
        repoId: self.getRepoId(),
        source: self.getSource()
      });

      self.emit("task.found", task);
      self.addTask(task);
      id++;
    });
  }

  clone.replace(new RegExp(LINK_STYLE_REGEX), function(md, text, list, order, pos) {
    if (self.isValidTask(clone, pos)) {
      var line = (clone.substring(0,pos).match(/\n/g)||[]).length + 1;
      var task = new Task({
        text:text,
        html:marked(text),
        list: list,
        order: parseFloat(order),
        line: line,
        id: id,
        repoId: self.getRepoId(),
        source: self.getSource()
      });

      self.emit("task.found", task);
      self.addTask(task);
      id++;
    }
  });
  this.emit("tasks", this.tasks);
  return this;
};

File.prototype.modifyTask = function(task) {
  self = this;
  var n = 0, modified = false;

  //console.log("modifying task...");
  //console.log(task);
  // Check for codestyle tasks
  var codeStyleRegex = this.getCodeStyleRegex();
  if (codeStyleRegex) {
    this.content = this.content.replace(codeStyleRegex, function(match, start, list, order, text, pos) {

      var newText = match;
      if (n === task.id) {
        // if the new list is not all upercase use md style
        if (/[A-Z]+/.test(task.list)) {
          newText = self.taskText(start, text, task.list, task.order, true);
        } else {
          newText = self.taskText(start, text, task.list, task.order);
          delete task.codeStyle;
        }
        
        modified = true;
      } 
      n++;
      return newText;
    });
  } 

  this.content = this.content.replace(new RegExp(LINK_STYLE_REGEX), function(md, text, list, order, pos) {
    if (!self.isValidTask(self.content, pos)) {
      return md;
    }

    var newMD = md;
    if (n === task.id) {
      if (/[A-Z]+/.test(task.list) && codeStyleRegex) {
        newMD = self.taskText("", text, task.list, task.order, true);
        task.codeStyle = true;
      } else {
        newMD = self.taskText("", text, task.list, task.order);
      }
      modified = true;
    } 
    n++;
    return newMD;
  });

  if (modified) {
    //console.log("task modified...");
    //console.log(task);
    //console.log(this.content);
    self.emit("task.modified", task);
    self.emit("file.modified", self);
  }

  return task;
};

File.prototype.taskText = function(start, text, list, order, codeStyle) {
  if (codeStyle) return start + list + ":" + order + " " + text;
  return start + "[" + text + "](#" + list + ":" + order + ")";
};

File.prototype.getSource = function() {
  var self = this;
  return {
    path: self.getPath(),
    id: self.getId(),
    type: self.getType(),
    lang: self.getLang().name,
    modified: self.getModified(),
    modifiedTime: self.getModifiedTime()
  };
};


module.exports = File;