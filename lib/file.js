'use strict';

var _         = require("lodash"),
    os        = require('os'),
    crypto    = require("crypto"),
    events    = require('events'),
    util      = require('util'),
    path      = require('path'),
    fm        = require('front-matter'),
    eol       = require('eol'),
    tools     = require('./tools'),
    marked    = tools.marked,
    log       = require('debug')('imdone-core:File'),
    Task      = require('./task');

var ERRORS = {
  NOT_A_TASK: "task must be of type Task"
};

const escapeRegExp = tools.escapeRegExp

/**
 * Description
 * @method File
 * @param {} repoId
 * @param {} filePath
 * @param {} content
 * @param {} modifiedTime
 * @return
 *
 * */
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
    this.languages = opts.languages || require('./languages');
    this.modified = false;
    this.frontMatter = {
      tags: [],
      context: [],
      meta: {}
    }
    this.tasks = [];
    this.isDir = false;
    this.lineCount = 0;
  }
}
util.inherits(File, events.EventEmitter);
// TODO:20 Add GFM style tasks with [todotext project](https://github.com/todotxt/todo.txt#project) is the list name id:2 gh:90
var LINK_STYLE_REGEX = File.LINK_STYLE_REGEX = /\[(.+?)\]\(#([\w\-]+?)(:)(\d+?\.?\d*?)?\)/gm;
var CODE_BLOCK_REGEX = File.CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm;
var INLINE_CODE_REGEX = File.INLINE_CODE_REGEX = /`[\s\S]*?`/g;
var CODE_STYLE_END = "((:)(\\d+?\\.?\\d*?)?)?\\s+(.*)$";
var CODE_STYLE_PATTERN = File.CODE_STYLE_PATTERN = "([A-Z]+[A-Z-_]+?)" + CODE_STYLE_END;
var HASH_STYLE_REGEX = File.HASH_STYLE_REGEX = /#([a-zA-Z-_]+?):(\d+?\.?\d*?)?\s+(.*)$/gm;

var getTaskId = File.getTaskId = function(path, line, text) {
  var shasum = crypto.createHash('sha1');
  shasum.update(path + "|" + line + "|" + text.trim());
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
  return _.find(this.getTasks(), {id:id}) ||
    _.find(this.getTasks(), task => task.meta && task.meta.id && task.meta.id[0] === id.toString());
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

File.prototype.getDescriptionChars = function(inCodeBlock) {
  if (!this.isCodeFile()) return ''
  const lang = this.getLang()
  if (inCodeBlock && lang.block && lang.block.ignore) return lang.block.ignore
  return lang.symbol
}

File.prototype.getRawDescription = function({config, content, inCodeBlock}) {
  const rawDescription = this.getCommentsAfterLine({config, content, inCodeBlock})
  const blockEnd = this.getLang().block && this.getLang().block.end
  if (this.isCodeFile()
      && blockEnd
      && rawDescription.length > 0
      && rawDescription[rawDescription.length-1].indexOf(blockEnd) > -1) rawDescription.pop()
  return rawDescription
}

File.prototype.getCommentsAfterLine = function({config, content, inCodeBlock}) {
  const commentLines = []
  let lines = eol.split(content);
  const lang = this.getLang()
  for(let i=1; i < lines.length; i++) {
    let line = lines[i];
    debugger
    if (this.isCodeFile() && !inCodeBlock && (line.indexOf(lang.symbol) < 0 || line.trim().indexOf(lang.symbol) > 0) || line.trim() === lang.symbol) break;
    if (this.isCodeFile() && lang.block && line.trim() === lang.block.end) break;
    if (this.isCodeFile() && lang.block && line.trim() === lang.block.ignore) break;
    if (!this.isCodeFile() && line === '') break;
    if (this.hasTaskInText(config, line)) break;
    if (line && lang.block) line = line.replace(lang.block.end,'')
    if (line.trim() !== '') commentLines.push(line)
  }
  return commentLines;
}

File.prototype.modifyDescription = function(task, config) {
  const descStart = this.getLinePos(task.line+1);
  const taskStart = this.getLinePos(task.line);
  const contentWithTask = this.getContent().substring(taskStart)
  let rawDescription = this.getRawDescription({config, content: contentWithTask, inCodeBlock: task.inCodeBlock})
  let beforeDescContent = this.getContent().substring(0, descStart);
  if (descStart === this.getContent().length && !beforeDescContent.endsWith(os.EOL)) beforeDescContent += os.EOL
  let content = this.getContent().substring(descStart)
  let spaces = ''
  if (this.isCodeFile() && !this.isMarkDownFile()) {
    spaces = contentWithTask.substring(0, task.commentStartOnLine)
    spaces = spaces.replace(/\S/g, ' ')
  }
  const descriptionStartsWith = task.descriptionStartsWith ? `${task.descriptionStartsWith} ` : ''
  const description = task.description.map(desc => `${spaces}${descriptionStartsWith}${desc}`).join(os.EOL)
  if (rawDescription.length === 0  && description.length > 0) {
    beforeDescContent += description+os.EOL
  } else {
    rawDescription = rawDescription.join(os.EOL)
    if (!this.isMarkDownFile() && task.singleLineBlockComment && rawDescription.length > 0 && description.length === 0) rawDescription += os.EOL
    content = content.replace(rawDescription, description)
  }
  content = content.replace(/^[\r\n]+/, os.EOL).replace(/[\r\n]+$/, os.EOL)
  this.setContent(beforeDescContent + content)
};

File.prototype.newTask = function({originalList, taskStartOnLine, rawTask, config, list, text, order, line, type, hasColon, content, inCodeBlock, singleLineBlockComment}) {
  var self = this;
  const lang = this.getLang()
  let description = []
  const rawDescription = this.getRawDescription({config, content, inCodeBlock})
  if (!singleLineBlockComment) {
    description = this.isCodeFile() ? rawDescription.map(line => this.trimCommentChars(line)) : _.clone(rawDescription)
  }
  // console.log(description)
  const descriptionStartsWith = this.getDescriptionChars(inCodeBlock)
  const frontMatter = this.frontMatter
  text = this.trimCommentBlockEnd(text)
  let commentStartOnLine = content.search(/\w/) - (descriptionStartsWith.length + 1)
  if (descriptionStartsWith === lang.symbol) commentStartOnLine = taskStartOnLine
  var task = new Task({
    frontMatter,
    inCodeBlock,
    singleLineBlockComment,
    rawTask,
    text,
    originalList,
    list,
    rawDescription,
    description,
    descriptionStartsWith,
    taskStartOnLine,
    commentStartOnLine,
    hasColon,
    order,
    line,
    id: getTaskId(self.getPath(), line, text),
    repoId: self.getRepoId(),
    source: self.getSource(),
    type
  });
  return task;
};

File.prototype.getCodeCommentRegex = function() {
  // #TODO:60 Allow languages to have multiple block comment styles, like html gh:13 id:5
  var lang = this.getLang();
  var symbol = lang.symbol;
  var reString = escapeRegExp(symbol) + "[^{].*$";

  if (lang.block) {
    var start = escapeRegExp(lang.block.start);
    var end = escapeRegExp(lang.block.end);
    //
    reString = reString + "|" + start + "(.|[\\r\\n])*?" + end;
  }

  return new RegExp(reString, "gmi");
};

File.prototype.trimCommentStart = function(text) {
  if (this.isCodeFile() && this.getLang().symbol) {
    var start = escapeRegExp(this.getLang().symbol);
    var startPattern = `^\\s*${start}\\s?`;
    return text.replace(new RegExp(startPattern), "");
  }
  return text;
};

File.prototype.trimCommentBlockEnd = function(text) {
  if (this.isCodeFile() && this.getLang().block) {
    var blockEnd = escapeRegExp(this.getLang().block.end);
    var endPattern = `\\s?${blockEnd}.*$`;
    return text.replace(new RegExp(endPattern), "");
  }
  return text;
};

File.prototype.trimCommentBlockStart = function(text) {
  if (this.isCodeFile() && this.getLang().block) {
    var blockStart = escapeRegExp(this.getLang().block.start);
    var startPattern = `^\\s*${blockStart}\\s?`;
    return text.replace(new RegExp(startPattern), "");
  }
  return text;
};

File.prototype.trimCommentBlockIgnore = function(text) {
  if (this.isCodeFile() && this.getLang().block && this.getLang().block.ignore) {
    var blockIgnore = escapeRegExp(this.getLang().block.ignore)
    var ignorePattern = `^\\s*${blockIgnore}\\s?`;
    return text.replace(new RegExp(ignorePattern), "");
  }
  return text;
};

File.prototype.trimCommentChars = function(text) {
  let newText = this.trimCommentStart(text);
  if (text === newText) newText = this.trimCommentBlockEnd(text);
  if (text === newText) newText = this.trimCommentBlockStart(text);
  if (text === newText) newText = this.trimCommentBlockIgnore(text);
  return newText;
};

File.prototype.hasCodeStyleTask = function(config, text) {
  if (!this.isCodeFile()) return false;
  let result = new RegExp(CODE_STYLE_PATTERN).exec(text);
  if (!result) return false;
  return config.includeList(result[1])
};

File.prototype.hasTaskInText = function(config, text) {
  // TODO:210 Make sure the tag is in our list of tags before we call it a task id:27 gh:121
  return (this.hasCodeStyleTask(config, text)
    || new RegExp(HASH_STYLE_REGEX).test(text)
    || new RegExp(LINK_STYLE_REGEX).test(text));
};

File.prototype.isInCodeBlock = function(content) {
  if (!this.isCodeFile()) return false
  const lang = this.getLang()
  return (lang.block && lang.block.start && content.trim().startsWith(lang.block.start))
}

File.prototype.isSingleLineBlockComment = function (content) {
  return eol.split(content).length === 1
}

File.prototype.extractCodeStyleTasks = function(config, pos, content) {
  var self = this;
  var codeStyleRegex = new RegExp(CODE_STYLE_PATTERN, "gm");
  var result;
  const inCodeBlock = this.isInCodeBlock(content)
  const singleLineBlockComment = inCodeBlock && this.isSingleLineBlockComment(content)
  while((result = codeStyleRegex.exec(content)) !== null) {
    var posInContent = pos + result.index;
    var line = this.getLineNumber(posInContent);
    if (self.hasTaskAtLine(line)) continue
    var charBeforeList = this.getContent().substring(posInContent-1, posInContent);
    if (this.startsWithCommentOrSpace(posInContent) && charBeforeList !== "#") {
      var list = result[1];
      if (self.ignoreCodeList(list, config)) continue; // #BACKLOG:30 Save all lists found so we can present them to the user id:6 gh:92
      var rawTask = result[0];
      var text = result[5];
      // console.log(inCodeBlock, line, text)
      const linePos = self.getLinePos(line)
      const matchCharsInFront = this.getContent().substring(linePos, posInContent).match(/\S+\s*/)
      const charsInFront = matchCharsInFront ? matchCharsInFront[0].length : 0
      var hasColon = ( result[3] !== undefined ) || ! (config && config.keepEmptyPriority);
      var order = "";
      if (!File.usingImdoneioForPriority(config)) {
        order = (result[4] === undefined) ? ( config && config.keepEmptyPriority ? "" : 0 ) : parseFloat(result[4]);
      }
      const originalList = list;
      const taskStartOnLine = inCodeBlock ? posInContent - charsInFront - linePos : pos - linePos;
      var task = self.newTask({originalList, taskStartOnLine, rawTask, config, list, text, order, line, type: Task.Types.CODE, hasColon, content: self.getContent().substring(linePos), inCodeBlock, singleLineBlockComment});
      self.addTask(task);
      self.emit("task.found", task);
    }
  }
};

File.prototype.startsWithCommentOrSpace = function(pos) {
  var lang = this.getLang();
  var symbol = lang.symbol;
  var blockStart = lang.block && lang.block.start;
  if (symbol === this.getContent().substring((pos - symbol.length), pos)) return true;
  if (blockStart && blockStart === this.getContent().substring((pos - blockStart.length), pos)) return true;
  if (this.getContent().substring(pos-1, pos) === ' ') return true;
  return false;
};

File.prototype.extractHashStyleTasks = function(config, pos, content) {
  var self = this;
  var hashStyleRegex = new RegExp(HASH_STYLE_REGEX);
  var result;
  while((result = hashStyleRegex.exec(content)) !== null) {
    var posInContent = pos + result.index;
    var line = this.getLineNumber(posInContent);
    if (self.hasTaskAtLine(line)) continue
    var list = result[1];
    if (self.ignoreHashList(list, config)) continue; // #BACKLOG:20 Save all lists found so we can present them to the user id:6 gh:109
    var rawTask = result[0];
    var order = "";
    if (!File.usingImdoneioForPriority(config))
      order = (result[2] === undefined) ? ( config && config.keepEmptyPriority ? "" : 0 ) : parseFloat(result[2]);

    var text = result[3];
    var lang = this.getLang()
    if (lang.block) {
      const blockEndPos = text.indexOf(lang.block.end)
      if (blockEndPos > -1) text = text.substring(0,blockEndPos)
    }
    var task = this.newTask({config, list, text, order, line, type: Task.Types.HASHTAG, hasColon: true, content: content.substring(result.index)});
    task.taskStartOnLine = pos - self.getLinePos(line);
    task.rawTask = rawTask;
    self.addTask(task);
    self.emit("task.found", task);
  }
};

File.prototype.ignoreCodeList = function(name, config) {
  if (config && config.ignoreList(name)) return true
  if (!this.isCodeFile()) return true;
  return !config.includeList(name);
};

File.prototype.ignoreHashList = function(name, config) {
  if (config && config.ignoreList(name)) return true
  if (this.isCodeFile() && !config.includeList(name)) return true
  return false;
};

File.prototype.extractLinkStyleTasks = function(config, pos, content) {
  var self = this;
  var linkStyleRegex = new RegExp(LINK_STYLE_REGEX);
  var result;
  while((result = linkStyleRegex.exec(content)) !== null) {
    var line = this.getLineNumber(result.index + pos);
    if (self.hasTaskAtLine(line)) continue
    var list = result[2];
    if (self.ignoreHashList(list, config)) continue; // #BACKLOG:40 Save all lists found so we can present them to the user id:8 gh:94
    var rawTask = result[0];
    var order = "";
    if (!File.usingImdoneioForPriority(config))
      order = !result[4] ? ( config && config.keepEmptyPriority ? "" : 0 ) : parseFloat(result[4]);
    var text = result[1];
    log = require('debug')('extractLinkStyleTasks');
    log("*********************************************************");
    log(result);
    log("list:%s text:%s order:%d line:%d", list, text, order, line);
    var task = self.newTask({config, list, text, order, line, type: Task.Types.MARKDOWN, hasColon: true, content: ''});
    task.rawTask = rawTask;
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
    // console.log('')
    // console.log('------------------------------------------------------------------------------------------------')
    // console.log(comment)
    self.extractHashStyleTasks(config, commentStart, comment);
    self.extractLinkStyleTasks(config, commentStart, comment);
    self.extractCodeStyleTasks(config, commentStart, comment);
  }
};

File.prototype.extractTasksInNonCodeFile = function(config) {
  // TODO:70 As a user I would like imdone to recognize code style tasks in markdown file comments id:38 gh:140 ic:gh
  // - If the file type has a block attribute, then search for code style tasks in comments
  this.extractHashStyleTasks(config, 0, this.getContent());
  this.extractLinkStyleTasks(config, 0, this.getContent());
};

File.hasWindowsEOL = function(content) {
  return /\r\n|\r/.test(content);
};

File.getUnixContent = function(content) {
  return content.replace(/\r\n|\r/g, '\n');
};

File.prototype.getLinePos = function(lineNo) {
  var re = /^/gm;
  var line = 1;
  var content = eol.lf(this.getContent());
  var result;
  while ((result = re.exec(content)) !== null) {
    if (line == lineNo) {
      return (File.hasWindowsEOL(this.getContent())) ? result.index + line-1 : result.index;
    }
    if (result.index === re.lastIndex) re.lastIndex++;
    line++;
  }
  return this.getContent().length
};

File.getLineNumber = function(content, pos) {
  const beforePos = content.substring(0,pos)
  const lines = eol.split(beforePos)
  return lines.length
};

File.prototype.getLineNumber = function(pos) {
  return File.getLineNumber(this.getContent(), pos);
};

File.prototype.deleteBlankLine = function(lineNo) {
  var startOfLine = this.getLinePos(lineNo);
  var startOfNextLine = this.getLinePos(lineNo+1);
  if (startOfNextLine < 0) return;
  var content = this.getContent();
  var lineContent = content.substring(startOfLine, startOfNextLine);
  if (lineContent.trim() === '') {
    var start = content.substring(0,startOfLine);
    var end = content.substring(startOfNextLine);
    this.setContent(start + end);
  }
};

File.prototype.deleteEmptyBlock = function(beforeContent, afterContent) {
  const lang = this.getLang()
  if (this.isCodeFile() && lang.block) {
    const beforeContentTrim = beforeContent.trim()
    const blockStartTrimPos = beforeContentTrim.lastIndexOf(lang.block.start)
    if ((blockStartTrimPos > -1) && (blockStartTrimPos === beforeContentTrim.length - lang.block.start.length)) {
      const blockStartPos = beforeContent.lastIndexOf(lang.block.start)
      const blockEndPos = afterContent.indexOf(lang.block.end) + lang.block.end.length
      beforeContent = beforeContent.substring(0, blockStartPos)
      afterContent = afterContent.substring(blockEndPos)
    }
  } else if (this.isMarkDownFile() && beforeContent.trim().endsWith(os.EOL + '-')) {
    const eol = os.EOL.replace('\\', '\\\\')
    beforeContent = beforeContent.replace(new RegExp(eol + '\\s*-\\s*$'), '')
    afterContent = afterContent.replace(new RegExp('^' + eol), '')
  }

  this.setContent(beforeContent + afterContent)
}

File.prototype.tasksMatch = function(task, line, taskText) {
  return (task.id == getTaskId(this.getPath(), line, taskText) ||
          (task.meta.id && Task.getMetaData(taskText).id && (task.meta.id[0] === Task.getMetaData(taskText).id[0]))
        );
};

File.prototype.hasTaskAtLine = function(line) {
  return this.getTasks().find(task => task.line === line)
}

File.prototype.deleteDescription = function(task, config) {
  if (task.singleLineBlockComment) return
  task.description = [] 
  this.modifyDescription(task, config)
}

File.prototype.deleteTask = function(task, config) {
  var self = this;
  this.deleteDescription(task, config)
  if (task.type === Task.Types.CODE) {
    this.deleteCodeOrHashTask(new RegExp(CODE_STYLE_PATTERN, "gm"), task, config);
  } else if (task.type === Task.Types.HASHTAG) {
    this.deleteCodeOrHashTask(HASH_STYLE_REGEX, task, config);
  } else if (task.type === Task.Types.MARKDOWN) {
    this.deleteLinkTask(task, config);
  }
};

File.prototype.deleteCodeOrHashTask = function(re, task, config) {
  var log = require('debug')('delete-task:deleteCodeOrHashTask');
  var self = this;
  var line = task.getLine();
  re = new RegExp(re);
  re.lastIndex = this.getLinePos(line);
  var result = re.exec(this.getContent());
  if (result) {
    log('Got result: %j', result);
    var lang = self.getLang();
    var text = result[ task.type === Task.Types.HASHTAG ? 3 : 5 ];
    var taskText = this.trimCommentBlockEnd(text);
    if (this.tasksMatch(task, line, taskText)) {
      var index = result.index;
      var afterStart = re.lastIndex;
      if (index < 0) index = 0;
      if (self.isCodeFile()) {
        var commentStart = this.getLinePos(line) + task.taskStartOnLine;
        var commentPrefix = this.getContent().substring(commentStart, index);
        var symbolRe = new RegExp(escapeRegExp(lang.symbol) + "\\s*");
        if (symbolRe.test(commentPrefix)) index = commentStart;
        else if (lang && lang.block && lang.block.end) {
          var blockEndRe = new RegExp(escapeRegExp(lang.block.end) + "\\s*$");
          var match = blockEndRe.exec(task.rawTask);
          if (match) afterStart -= match[0].length;
        }
      }
      var beforeContent = this.getContent().substring(0, index);
      var afterContent = this.getContent().substring(afterStart);
      this.deleteEmptyBlock(beforeContent, afterContent)
      this.deleteBlankLine(line);
      this.setModified(true);
      // task.type = Task.Types.HASHTAG;
      this.emit("task.deleted", task);
      this.emit("file.modified", self);
    }
  }

  return this;
};

File.prototype.deleteLinkTask = function(task, config) {
  var log = require('debug')('delete-task:deleteLinkTask');
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
    if (this.tasksMatch(task, line, text)) {
      var beforeContent = this.getContent().substring(0, result.index);
      var afterContent = this.getContent().substring(re.lastIndex);
      this.setContent(beforeContent + afterContent);
      this.deleteBlankLine(line);
      this.setModified(true);
      this.emit("task.deleted", task);
      this.emit("file.modified", self);
      return this;
    }
  }

  return this;
};

File.prototype.modifyTask = function(task, config) {
  var self = this;
  if (task.type === Task.Types.CODE) {
    this.modifyCodeOrHashTask(new RegExp(CODE_STYLE_PATTERN, "gm"), task, config);
  } else if (task.type === Task.Types.HASHTAG) {
    this.modifyCodeOrHashTask(HASH_STYLE_REGEX, task, config);
  } else if (task.type === Task.Types.MARKDOWN) {
    this.modifyLinkTask(task, config);
  }
};

File.prototype.modifyCodeOrHashTask = function(re, task, config) {
  log('In modifyCodeOrHashTask:%j', task);
  log('--------------------------------')
  log(`modifying task: ${task.rawTask}`)
  log(`line: ${task.line}`)
  log(`description: ${task.description.join(os.EOL)}`)
  var self = this;
  var line = task.getLine();
  re = new RegExp(re);
  var lang = this.getLang();
  var linePos = re.lastIndex = this.getLinePos(line);
  var nextLinePos = this.getLinePos(line+1);
  var lineContent = this.getContent().substring(linePos,nextLinePos);
  if (lineContent.indexOf(lang.symbol) > -1) {
    re.lastIndex = this.getContent().indexOf(lang.symbol, linePos);
  }
  if (lang.block && lineContent.indexOf(lang.block.start) > -1) {
    re.lastIndex = this.getContent().indexOf(lang.block.start, linePos);
  }

  var result;
  while ((result = re.exec(this.getContent())) !== null) {
    log('Got result: %j', result);
    var rawTask = result[0];
    var list = result[1];
    var text = result[ task.type === Task.Types.HASHTAG ? 3 : 5 ];
    var taskText = this.trimCommentBlockEnd(text);
    if (this.tasksMatch(task, line, taskText)) {
      if (task.updatedText) task.text = task.updatedText 
      else task.updateTodoTxt()
      var index = result.index;
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, index);
      var afterContent = this.getContent().substring(re.lastIndex);
      if (task.inCodeBlock) {
        var blockEnd = text.indexOf(lang.block.end);
        if (blockEnd > -1) {
          const desc = (task.description.length > 0) ? `${os.EOL}${task.description.join(os.EOL)}` : ''
          text = task.text + desc + text.substring(blockEnd);
        } else text = task.text;
      } else text = task.text;
      if (/[a-z]/.test(task.list)) task.type = Task.Types.HASHTAG;
      var hash = task.type === Task.Types.HASHTAG ? "#" : "";
      var order = task.order === "" ? "" : util.format( "%d", task.order );
      var taskContent = util.format("%s%s%s%s %s", hash, task.list, task.hasColon ? ":" : "", order, text);
      task.line = this.getLineNumber(index)
      task.id = getTaskId(self.getPath(), task.line, task.text);
      this.setContent(beforeContent + taskContent + afterContent);
      if (!task.singleLineBlockComment) {
        this.modifyDescription(task, config)
      }
      this.setModified(true);
      this.emit("task.modified", task);
      this.emit("file.modified", self);
      return this;
    }
  }

  return this;
};

File.prototype.modifyLinkTask = function(task, config) {
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
    if (this.tasksMatch(task, line, text)) {
      if (task.updatedText) task.text = task.updatedText 
      else task.updateTodoTxt()
      var beforeContent = this.getContent().substring(0, result.index);
      var afterContent = this.getContent().substring(re.lastIndex);
      var taskContent;
      if ( task.order !== "" )
         taskContent = util.format("[%s](#%s:%d)", task.text, task.list, task.order);
      else
        taskContent = util.format("[%s](#%s:)", task.text, task.list );
      task.line = this.getLineNumber(rawTaskStart)
      task.id = getTaskId(self.getPath(), task.line, task.text);
      this.setContent(beforeContent + taskContent + afterContent);
      this.modifyDescription(task, config)
      this.setModified(true);
      this.emit("task.modified", task);
      this.emit("file.modified", self);
      return this;
    }
  }

  return this;
};

File.prototype.modifyTaskFromHtml = function(task, html) {
  const checks = task.getChecksFromHtml(html);
  const re = /- \[[\sx]{1}\]/g;
  const descStart = this.getLinePos(task.line+1);
  const descEnd = this.getLinePos(task.line+1 + task.description.length);
  let descContent = (descEnd > 0) ? this.getContent().substring(descStart, descEnd) : this.getContent().substring(descStart)
  const beforeDescContent = this.getContent().substring(0, descStart);
  const afterDescContent = (descEnd > 0) ? this.getContent().substring(descEnd) : ''
  let i = 0;
  descContent = descContent.replace(re, (match) => {
    const check = checks[i]
    i++;
    if (check === undefined) return match
    let char = check ? 'x' : ' ';
    return `- [${char}]`;
  })

  this.setContent(beforeDescContent + descContent + afterDescContent);
};

File.prototype.modifyTaskFromContent = function(task, content, config) {
  let lines = eol.split(content.trim());
  task.updatedText = lines.shift().trim()
  task.description = lines
  this.modifyTask(task, config)
};

function getFrontMeta(meta) {
  const metadata = {}
  _.forEach(meta, (val, prop) => {
    if (_.isArray(val)) {
      val.forEach((item) => {
        if (_.isObject(item) || _.isArray(item)) return
        if (!metadata[prop]) metadata[prop] = []
        metadata[prop].push(`${item}`)
      })
    }
  })
  return metadata
}

File.prototype.parseFrontMatter = function() {
  this.frontMatter = {
    tags: [],
    context: [],
    meta: {}
  }
  const fmContent = fm(this.getContent())
  if (fmContent.frontmatter) {
    const attributes = fmContent.attributes
    if (attributes.meta) this.frontMatter.meta = getFrontMeta(attributes.meta)
    if (attributes.context && _.isArray(attributes.context)) this.frontMatter.context = attributes.context
    if (attributes.tags && _.isArray(attributes.tags)) this.frontMatter.tags = attributes.tags
  }
}

/**
 * Description
 * @method extractTasks
 * @return ThisExpression
 */

File.prototype.extractTasks = function(config) {
  this.tasks = [];
  if (this.isMarkDownFile()) this.parseFrontMatter()
  if (this.isCodeFile()) {
    this.extractTasksInCodeFile(config);
  } else {
    this.extractTasksInNonCodeFile(config);
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
    order = (order === undefined) ? "" : order;
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

File.usingImdoneioForPriority = function(config) {
  return config && config.sync && config.sync.useImdoneioForPriority;
};

module.exports = File;
