'use strict';

var _clone    = require('lodash.clone'),
    _isObject = require('lodash.isobject'),
    _assign   = require('lodash.assign'),
    _omit     = require('lodash.omit'),
    _get      = require('lodash.get'),
    os        = require('os'),
    crypto    = require("crypto"),
    events    = require('events'),
    util      = require('util'),
    path      = require('path'),
    matter    = require('gray-matter'),
    eol       = require('eol'),
    lf        = String(eol.lf),
    tools     = require('./tools'),
    log       = require('debug')('imdone-core:File'),
    chrono    = require('chrono-node'),
    Task      = require('./task');

const ERRORS = {
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
  if (_isObject(opts.file)) {
    _assign(this, opts.file);
    this.tasks.forEach(task => {
      task = new Task(task);
    });
  } else {
    this.repoId = opts.repoId;
    this.path = opts.filePath;
    this.content = opts.content;
    this.modifiedTime = opts.modifiedTime;
    this.createdTime = opts.createdTime
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
// TODO:15 Add GFM style tasks with [todotext project](https://github.com/todotxt/todo.txt#project) is the list name id:2 gh:90
// DONE:10 Add scientific notation to order regex `-?[\d.]+(?:e-?\d+)?`
// <!-- completed:2020-02-19T21:49:17.379Z -->
const START_TAG = File.START_TAG = '<card>'
const END_TAG = File.END_TAG = '</card>'
var CODE_BLOCK_REGEX = File.CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm;
var INLINE_CODE_REGEX = File.INLINE_CODE_REGEX = /`[\s\S]*?`/g;
var CODE_STYLE_END = "((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$";
var CODE_STYLE_PATTERN = File.CODE_STYLE_PATTERN = "([A-Z]+[A-Z-_]+?)" + CODE_STYLE_END;
var HASH_STYLE_PATTERN = File.HASH_STYLE_PATTERN = /#([a-zA-Z-_]+?):(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm;
var HASH_STYLE_META_ORDER_PATTERN = File.HASH_STYLE_META_ORDER_PATTERN = /#([a-zA-Z-_]+?)[ \t]+(.+)$/gm;
var LINK_STYLE_PATTERN = File.LINK_STYLE_PATTERN = /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?\))/gm;
var LINK_STYLE_PATTERN_META_ORDER = File.LINK_STYLE_PATTERN_META_ORDER = /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)\))/gm;

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
  return _omit(this, ["domain", "_events", "_maxListeners"]);
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
  this.content = content
  return this;
};

File.prototype.setContentFromFile = function(content) {
  this.hasWindowsEOL = File.hasWindowsEOL(content)
  this.content = eol.lf(content || '');
  return this;
};

/**
 * Description
 * @method getContent
 * @return MemberExpression
 */
File.prototype.getContent = function() {
  return this.content
};

File.prototype.getContentForFile = function() {
  if (this.hasWindowsEOL && os.EOL === String(eol.crlf)) return eol.auto(this.content || '')
  return eol.lf(this.content || '');
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

File.prototype.setCreatedTime = function(createdTime) {
  this.createdTime = createdTime;
  return this;
};

File.prototype.getCreatedTime = function() {
  return this.createdTime;
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
  return this.getTasks().find(task => id === task.id) ||
  this.getTasks().find(task => task.meta && task.meta.id && task.meta.id[0] === id.toString());
};

/**
 * Description
 * @method addTask
 * @param {} task
 * @return MemberExpression
 */
File.prototype.addTask = function(task) {
  if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK);
  if (!Array.isArray(this.tasks)) this.tasks = [];
  var index = this.tasks.findIndex(({id}) => task.id === id);
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
  if (!Array.isArray(this.tasks)) this.tasks = [];
  var index = this.tasks.findIndex(({id}) => task.id === id)
  if (index > -1) {
    this.tasks.splice(index,1);
  }
};

/**
 * Description
 * @method ignoreCodeBlocks
 * @return cleanContent
 */
File.prototype.ignoreCodeBlocks = function() { // TODO:  This is not used, but we need a way to ignore tasks in code blocks. Maybe save position ranges
  var cleanContent = this.content;
  var replacer = function(block) {
    block = block.replace(new RegExp(LINK_STYLE_PATTERN), "**TASK**");
    block = block.replace(new RegExp(HASH_STYLE_PATTERN), "**TASK**");
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
  return /^md|markdown$/i.test(this.getExt())
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
  return path.extname(this.path).substring(1).toLowerCase();
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

File.prototype.getRawDescription = function({config, content, inCodeBlock, beforeText}) {
  const { rawDescription, preserveBlankLines, hasCardEndTag} = this.getTaskContent({config, content, inCodeBlock, beforeText})
  const blockEnd = this.getLang().block && this.getLang().block.end
  if (this.isCodeFile()
      && blockEnd
      && rawDescription.length > 0
      && rawDescription[rawDescription.length-1].indexOf(blockEnd) > -1) rawDescription.pop()
  return { rawDescription, preserveBlankLines, hasCardEndTag }
}

File.prototype.getTaskContent = function({config, content, inCodeBlock, beforeText}) {
  const commentLines = []
  let lines = eol.split(content);
  const preserveBlankLines = this.isMarkDownFile() && lines.length > 1 && lines[1].trim() === START_TAG
  const lang = this.getLang()
  let openBlockTokens = 0
  let closeBlockTokens = 0
  let hasCardEndTag = false
  for(let i = preserveBlankLines ? 2 : 1; i < lines.length; i++) {
    let line = lines[i];
    if (this.isMarkDownFile() && line.trim().indexOf('<!--') > -1) openBlockTokens++
    if (this.isMarkDownFile() && line.trim().indexOf('-->') > -1) closeBlockTokens++

    if (preserveBlankLines) {
        if (line.trim() === END_TAG) {
          hasCardEndTag = true
          break;
        }
    } else {
      if (this.isMarkDownFile()
        && beforeText 
        && /^\s*(\*|-|\d+\.|[a-zA-Z]\.)\s$/.test(beforeText)
        && line.search(/\S/) <= beforeText.search(/\S/)
      ) break;
      if (this.isCodeFile() && !inCodeBlock && (line.indexOf(lang.symbol) < 0 || line.trim().indexOf(lang.symbol) > 0) || line.trim() === lang.symbol) break;
      if (this.isCodeFile() && lang.block && line.trim() === lang.block.end) break;
      if (this.isCodeFile() && lang.block && line.trim() === lang.block.ignore) break;
      if (!this.isCodeFile() && line.trim() === '') break;
    }
    if (this.hasTaskInText(config, line)) break;
    
    if (line && lang.block) line = line.replace(lang.block.end,'')
    
    if (preserveBlankLines || line.trim() !== '') commentLines.push(line)
  }
  if (this.isMarkDownFile() && commentLines.length && commentLines[commentLines.length-1].trim() === '-->' && openBlockTokens !== closeBlockTokens) commentLines.pop()
  return { rawDescription: commentLines, preserveBlankLines, hasCardEndTag};
}

File.prototype.modifyDescription = function(task, config) {
  const descStart = this.getLinePos(task.line+1);
  const taskStart = this.getLinePos(task.line);
  const contentWithTask = this.getContent().substring(taskStart)
  let { 
    rawDescription, 
    preserveBlankLines, 
    hasCardEndTag 
  } = this.getRawDescription({
    config,
    content: contentWithTask,
    inCodeBlock: task.inCodeBlock,
    beforeText: task.beforeText
  })
  let beforeDescContent = this.getContent().substring(0, descStart);
  if (descStart === this.getContent().length && !beforeDescContent.endsWith(lf)) beforeDescContent += lf
  let content = this.getContent().substring(descStart)
  let spaces = ''
  if (this.isCodeFile() && !this.isMarkDownFile()) {
    spaces = contentWithTask.substring(0, task.commentStartOnLine)
    spaces = spaces.replace(/\S/g, ' ')
  }
  const descriptionStartsWith = task.descriptionStartsWith ? `${task.descriptionStartsWith} ` : ''
  let description = task.description.map(desc => `${spaces}${descriptionStartsWith}${desc}`).join(lf)
  if (rawDescription.length === 0  && description.length > 0) {
    beforeDescContent += description+lf
  } else {
    if (preserveBlankLines) {
      rawDescription.unshift(START_TAG)
      if (hasCardEndTag) rawDescription.push(END_TAG)
    }
    rawDescription = rawDescription.join(lf)
    if (this.isMarkDownFile() && description.length > 0 && tools.hasBlankLines(description)) {
      task.preserveBlankLines = true
      description = `${START_TAG}${lf}${description}${lf}${END_TAG}`
    }
    if (task.singleLineBlockComment
          && rawDescription.length > 0 
          && description.length === 0) {
            rawDescription += lf
    }
    content = content.replace(rawDescription, description)
  }
  
  this.setContent(beforeDescContent + content)
};

File.prototype.newTask = function({
    originalList, 
    taskStartOnLine, 
    rawTask, 
    config, 
    list, 
    text, 
    order, 
    line, 
    type, 
    hasColon, 
    content, 
    inCodeBlock, 
    singleLineBlockComment, 
    pos 
  }) {
    var self = this;
    const lang = this.getLang()
    let description = []
    const linePos = this.getLinePos(line)
    // TODO:0.46875 ## add beforeText for code files
    const beforeText = this.isCodeFile() ? null : this.content.substring(linePos, pos)
    const { rawDescription, preserveBlankLines } = this.getRawDescription({config, content, inCodeBlock, beforeText})
    if (!singleLineBlockComment) {
      description = this.isCodeFile() ? rawDescription.map(line => this.trimCommentChars(line)) : _clone(rawDescription)
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
      type,
      beforeText,
      preserveBlankLines
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
    || new RegExp(HASH_STYLE_PATTERN).test(text)
    || new RegExp(HASH_STYLE_META_ORDER_PATTERN).test(text)
    || new RegExp(LINK_STYLE_PATTERN).test(text))
    && config.lists.find(list => text.includes(`#${list.name}`))
    ;
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
      if (!config.includeList(list)) continue
      var rawTask = result[0];
      var text = result[5];
      // console.log(inCodeBlock, line, text)
      const linePos = self.getLinePos(line)
      const matchCharsInFront = this.getContent().substring(linePos, posInContent).match(/\S+\s*/)
      const charsInFront = matchCharsInFront ? matchCharsInFront[0].length : 0
      var hasColon = ( result[3] !== undefined ) || ! (config && config.keepEmptyPriority);
      var order = (result[4] === undefined) ? ( config && config.keepEmptyPriority ? "" : 0 ) : parseFloat(result[4]);
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
  var hashStyleRegex = new RegExp(HASH_STYLE_PATTERN);
  var lang = this.getLang()
  var result;
  while((result = hashStyleRegex.exec(content)) !== null) {
    var [rawTask, list, order, text] = result;
    if (!config.listExists(list)) continue

    var posInContent = pos + result.index;
    var line = this.getLineNumber(posInContent);
    if (this.hasTaskAtLine(line)) continue

    order = (order === undefined) ? ( config && config.keepEmptyPriority ? "" : 0 ) : parseFloat(order);
    if (lang.block) {
      const blockEndPos = text.indexOf(lang.block.end)
      if (blockEndPos > -1) text = text.substring(0,blockEndPos)
    }
    var task = this.newTask({config, list, text, order, line, type: Task.Types.HASHTAG, hasColon: true, content: content.substring(result.index), pos: posInContent});
    task.taskStartOnLine = pos - this.getLinePos(line);
    task.rawTask = rawTask;
    this.addTask(task);
    this.emit("task.found", task);
  }
};

File.prototype.extractHashStyleTasksNoOrder = function(config, pos, content) {
  var hashStyleRegex = new RegExp(HASH_STYLE_META_ORDER_PATTERN);
  var lang = this.getLang()
  var result;
  while((result = hashStyleRegex.exec(content)) !== null) {
    var [rawTask, list, text] = result;
    if (!config.listExists(list)) continue

    var posInContent = pos + result.index;
    var line = this.getLineNumber(posInContent);
    if (this.hasTaskAtLine(line)) continue
    if (lang.block) {
      const blockEndPos = text.indexOf(lang.block.end)
      if (blockEndPos > -1) text = text.substring(0,blockEndPos)
    }
    var task = this.newTask({config, list, text, line, type: Task.Types.HASH_META_ORDER, hasColon: true, content: content.substring(result.index), pos: posInContent});
    task.taskStartOnLine = pos - this.getLinePos(line);
    task.rawTask = rawTask;
    this.addTask(task);
    this.emit("task.found", task);
  }
};

File.prototype.extractLinkStyleTasks = function(config, pos, content) {
  var self = this;
  var linkStyleRegex = new RegExp(LINK_STYLE_PATTERN);
  var result;
  while((result = linkStyleRegex.exec(content)) !== null) {
    const posInContent = result.index + pos
    var line = this.getLineNumber(posInContent);
    if (self.hasTaskAtLine(line)) continue
    let [match, before, rawTask, text, list, colon, order] = result
    if (!config.listExists(list)) continue
    order = !order ? ( config && config.keepEmptyPriority ? "" : 0 ) : parseFloat(order);
    
    log = require('debug')('extractLinkStyleTasks');
    log("*********************************************************");
    log(result);
    log("list:%s text:%s order:%d line:%d", list, text, order, line);
    
    var task = self.newTask({config, list, text, order, line, type: Task.Types.MARKDOWN, hasColon: !!colon, content: content.substring(result.index), pos: posInContent});
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
    self.extractHashStyleTasks(config, commentStart, comment);
    self.extractLinkStyleTasks(config, commentStart, comment);
    self.extractCodeStyleTasks(config, commentStart, comment);
  }
};

File.prototype.extractTasksInNonCodeFile = function(config) {
  // TODO:0.234375 ## Look for all styles of tasks with one pass of content +performance
  this.extractHashStyleTasks(config, 0, this.getContent());
  this.extractHashStyleTasksNoOrder(config, 0, this.getContent());
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
  var content = this.content;
  var result;
  while ((result = re.exec(content)) !== null) {
    if (line == lineNo) {
      return result.index;
      // return (File.hasWindowsEOL(this.getContent())) ? result.index + line-1 : result.index;
    }
    if (result.index === re.lastIndex) re.lastIndex++;
    line++;
  }
  return this.content.length
};

File.getLineNumber = function(content, pos) {
  const beforePos = content.substring(0,pos)
  const lines = eol.split(beforePos)
  return lines.length
};

File.prototype.getLineNumber = function(pos) {
  return File.getLineNumber(this.content, pos);
};

File.prototype.deleteBlankLine = function(lineNo) {
  var startOfLine = this.getLinePos(lineNo);
  if (this.isMarkDownFile()) startOfLine = startOfLine - 1
  var startOfNextLine = this.getLinePos(lineNo+1);
  if (startOfNextLine < 0) return;
  var content = this.content;
  var lineContent = content.substring(startOfLine, startOfNextLine);
  const trimmedLine = lineContent.trim()
  if (trimmedLine === '' || (this.isMarkDownFile() && /^(-|\*+|\#+)$/.test(trimmedLine))) {
    var start = content.substring(0,startOfLine);
    var end = content.substring(startOfNextLine);
    this.setContent(start + end);
  }
};

File.prototype.deleteTaskContent = function(beforeContent, afterContent) {
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
    this.deleteCodeOrHashTask(HASH_STYLE_PATTERN, task, config);
  } else if (task.type === Task.Types.HASH_META_ORDER) {
    this.deleteHashMetaOrderTask(HASH_STYLE_META_ORDER_PATTERN, task, config);
  }else if (task.type === Task.Types.MARKDOWN) {
    this.deleteLinkTask(task, config);
  }
};

File.prototype.deleteHashMetaOrderTask = function(re, task, config) {
  var log = require('debug')('delete-task:deleteHashMetaOrderTask');
  var self = this;
  var line = task.getLine();
  re = new RegExp(re);
  re.lastIndex = this.getLinePos(line);
  var result = re.exec(this.getContent());
  if (result) {
    log('Got result: %j', result);
    var [rawTask, list, text] = result;
    if (this.tasksMatch(task, line, text)) {
      var index = result.index;
      var afterStart = re.lastIndex;
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, index);
      var afterContent = this.getContent().substring(afterStart);
      this.deleteTaskContent(beforeContent, afterContent)
      this.deleteBlankLine(line);
      this.setModified(true);
      // task.type = Task.Types.HASHTAG;
      this.emit("task.deleted", task);
      this.emit("file.modified", self);
    }
  }
}

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
      this.deleteTaskContent(beforeContent, afterContent)
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
  var re = new RegExp(LINK_STYLE_PATTERN);
  log('re:%s', re);
  var pos = this.getLinePos(line);
  re.lastIndex = pos;
  var result;
  var content = self.getContent();
  while ((result = re.exec(content)) !== null) {
    log('Got result: %j', result);
    let [match, before, rawTask, text, list, colon, order] = result
    var rawTaskStart = pos + result.index
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

File.prototype.modifyTask = function(task, config, noEmit) {
  if (task.type === Task.Types.CODE) {
    this.modifyCodeOrHashTask(new RegExp(CODE_STYLE_PATTERN, "gm"), task, config, noEmit);
  } else if (task.type === Task.Types.HASHTAG) {
    this.modifyCodeOrHashTask(HASH_STYLE_PATTERN, task, config, noEmit);
  } else if (task.type === Task.Types.HASH_META_ORDER) {
    this.modifyHashMetaOrderTask(HASH_STYLE_META_ORDER_PATTERN, task, config, noEmit);
  } else if (task.type === Task.Types.MARKDOWN) {
    this.modifyLinkTask(task, config, noEmit);
  }
};

File.prototype.modifyHashMetaOrderTask = function(re, task, config, noEmit) {
  log('In modifyHashNoOrderTask:%j', task);
  log('--------------------------------')
  log(`modifying task: ${task.rawTask}`)
  log(`line: ${task.line}`)
  var self = this;
  var line = task.getLine();
  re = new RegExp(re);
  var lang = this.getLang();
  var result;
  while ((result = re.exec(this.getContent())) !== null) {
    log('Got result: %j', result);
    let text = result[2]
    var taskText = this.trimCommentBlockEnd(text);
    if (this.tasksMatch(task, line, taskText)) {
      if (task.updatedText) task.text = task.updatedText 
      var index = result.index;
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, index);
      var afterContent = this.getContent().substring(re.lastIndex);
      text = task.text;
      var taskContent = `#${task.list} ${task.text}`
      task.line = this.getLineNumber(index)
      task.id = getTaskId(self.getPath(), task.line, task.text);
      this.setContent(beforeContent + taskContent + afterContent);
      if (noEmit !== 'fromContent') {
        const newLine = _get(config, 'settings.cards.metaNewLine')
        task.updateOrderMeta(newLine)
      }
      this.modifyDescription(task, config)
      this.setModified(true);
      if (!noEmit) {
        this.emit("task.modified", task);
        this.emit("file.modified", self);
      }
      return this;
    }
  }
}

File.prototype.modifyCodeOrHashTask = function(re, task, config, noEmit) {
  log('In modifyCodeOrHashTask:%j', task);
  log('--------------------------------')
  log(`modifying task: ${task.rawTask}`)
  log(`line: ${task.line}`)
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
      // FIXME:0 This should not be used until we modify it to leave existing todo.txt alone, remove it in place and add new to first line of description
      // else {
      //   task.updateTodoTxt()
      // }
      var index = result.index;
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, index);
      var afterContent = this.getContent().substring(re.lastIndex);
      if (task.inCodeBlock) {
        var blockEnd = text.indexOf(lang.block.end);
        if (blockEnd > -1) {
          const desc = (task.description.length > 0) ? `${lf}${task.description.join(lf)}` : ''
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
      if (!noEmit) {
        this.emit("task.modified", task);
        this.emit("file.modified", self);
      }
      return this;
    }
  }

  return this;
};

File.prototype.modifyLinkTask = function(task, config, noEmit) {
  var log = require('debug')('modify-task:modifyLinkTask');
  log('In modifyLinkTask');
  var self = this;
  var line = task.getLine();
  var re = new RegExp(LINK_STYLE_PATTERN);
  log('re:%s', re);
  var pos = this.getLinePos(line);
  re.lastIndex = pos;
  var result;
  var content = self.getContent();
  while ((result = re.exec(content)) !== null) {
    log('Got result: %j', result);
    let [match, before, rawTask, text, list, colon, order] = result

    var rawTaskStart = before ? result.index + before.length : result.index;
    if (this.tasksMatch(task, line, text)) {
      // console.log('*** updatedText:', task.updatedText)
      if (task.updatedText) task.text = task.updatedText 
      // FIXME:10 This should not be used until we modify it to leave existing todo.txt alone, remove it in place and add new to first line of description
      // <!-- completed:2020-02-19T21:47:54.970Z -->
      // else task.updateTodoTxt()
      var beforeContent = this.getContent().substring(0, rawTaskStart);
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
      if (!noEmit) {
        this.emit("task.modified", task);
        this.emit("file.modified", self);
      }
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
  this.setModified(true);
};

File.parseDueDate = function(text) {
  if (text.includes('due:')) return text
  let dueString
  return text.replace(/(\sdue)\s.*?\./ig, (dueMatch, p1) => {
    if (dueString) return dueMatch
    try {
      const due = chrono.parseDate(dueMatch)
      dueString = due.toISOString()
      return `${p1.toLowerCase()}:${dueString}`
    } catch (e) {
      // console.log(`Unable to parsing due date for ${text}`)
      return dueMatch
    }
  })
}

File.addCompleted = function({task, content, config}) {
  if (!task || !config || !config.settings || !config.settings.doneList) return content
  if (task.completed || task.meta.completed) return content
  if (task.list !== config.settings.doneList) return content
  if (content.includes('completed:')) return content
  const now = (new Date()).toISOString()
  content = Task.addToLastCommentInContent(content, `completed:${now}`, config.settings.cards.metaNewLine)
  const lines = eol.split(content)
  return lines.join(lf)
}

File.prototype.updateMetaData = function (config) {
  if (this.isCodeFile()) return
  const lists = config.lists
                    .filter(list => !list.filter)
                    .map(list => list.name)
  this.getTasks().forEach(task => {
    let content = task.content.toString()

    if (_get(config, 'settings.cards.trackChanges') && task.hasListChanged(lists)) {
      const list = task.list
      const now = (new Date()).toISOString()
      content = Task.addToLastCommentInContent(content, `${list}:${now}`, config.settings.cards.metaNewLine)
      if (!task.meta[list]) task.meta[list] = []
      task.meta[list].push(now)
    }

    content = File.parseDueDate(content)
    content = File.addCompleted({task, content, config})
    
    if (content === task.content) return

    this.modifyTaskFromContent(task, content, config, true)
    task.parseTodoTxt()
  })
}

function updateTaskContent ({task, content}) {
  let lines = eol.split(content.trim());
  task.updatedText = lines.shift().trim()
  task.description = lines
}


File.prototype.modifyTaskFromContent = function(task, content, config, noEmit) {
  updateTaskContent({task, content})
  this.modifyTask(task, config, 'fromContent')
};


function getFrontMeta(meta) {
  const metadata = {}
  Object.entries(meta).forEach(([prop, val]) => {
    if (Array.isArray(val)) {
      val.forEach((item) => {
        if (_isObject(item) || Array.isArray(item)) return
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
  try {
    const {data, isEmpty} = matter(this.getContent())
    if (!isEmpty) {
      this.frontMatter = {props: {}, ...data, ...this.frontMatter}
      if (data.meta) this.frontMatter.meta = getFrontMeta(data.meta)
      if (data.context && Array.isArray(data.context)) this.frontMatter.context = data.context
      if (data.tags && Array.isArray(data.tags)) this.frontMatter.tags = data.tags
    }
  } catch (err) {
    console.error(`Error processing front-matter in:${this.path}`, err)
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
    modifiedTime: self.getModifiedTime(),
    createdTime: self.getCreatedTime()
  };
};

File.usingImdoneioForPriority = function(config) {
  return config && config.sync && config.sync.useImdoneioForPriority;
};

module.exports = File;
