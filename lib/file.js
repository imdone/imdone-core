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
    Task      = require('./task'),
    fastSort  = require('fast-sort/dist/sort');

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
const START_TAG = File.START_TAG = '<card>'
const END_TAG = File.END_TAG = '</card>'
const CODE_BLOCK_REGEX = File.CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm;
const INLINE_CODE_REGEX = File.INLINE_CODE_REGEX = /`[\s\S]*?`/g;
const CODE_STYLE_END = "((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$";
const CODE_STYLE_PATTERN = File.CODE_STYLE_PATTERN = "([A-Z]+[A-Z-_]+?)" + CODE_STYLE_END;
const HASH_STYLE_PATTERN = File.HASH_STYLE_PATTERN = /#([a-zA-Z-_]+?):(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm;
const HASH_STYLE_META_ORDER_PATTERN = File.HASH_STYLE_META_ORDER_PATTERN = /#([a-zA-Z-_]+?)[ \t]+(.+)$/gm;
const LINK_STYLE_PATTERN = File.LINK_STYLE_PATTERN = /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?\))/gm;
const CHECK_STYLE_PATTERN = File.CHECK_STYLE_PATTERN = /^(\s*- \[([x ])\]\s)(.+$)/gm;
// var LINK_STYLE_PATTERN_META_ORDER = File.LINK_STYLE_PATTERN_META_ORDER = /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)\))/gm;

var getTaskId = File.getTaskId = function(path, line, text) {
  var shasum = crypto.createHash('sha1');
  const taskElements = {path, line, text: text.trim()}
  shasum.update(JSON.stringify(taskElements));
  return shasum.digest('hex');
};

function getDoneList(config) {
  return _get(config, 'settings.doneList', 'DONE')
}

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

function updateTaskContent ({task, content}) {
  let lines = eol.split(content.trim());
  task.updatedText = lines.shift().trim()
  task.description = lines
}

File.hasWindowsEOL = function(content) {
  return /\r\n|\r/.test(content);
};

File.getUnixContent = function(content) {
  return content.replace(/\r\n|\r/g, '\n');
};

File.isMetaNewLine = function (config) {
  return _get(config, 'settings.cards.metaNewLine', false)
}

File.isFile = function(file) {
  return file instanceof File;
};

File.addCompleted = function({task, content, config}) {
  const doneList = getDoneList(config)
  if (!task || !config || !config.settings || !doneList) return content
  if (task.list !== doneList) return content
  if (task.completed || task.meta.completed) return content
  if (content.includes('completed:')) return content
  const now = (new Date()).toISOString()
  content = task.addToLastCommentInContent(content, `completed:${now}`, File.isMetaNewLine(config))
  const lines = eol.split(content)
  return lines.join(lf)
}

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

File.prototype.trackListChanges = function ({task, content, config, modify}) {
  const lists = config.lists
                    .filter(list => !list.filter)
                    .map(list => list.name)
                      
  const doneList = getDoneList(config)
  let beforeTextModified = false
  if (this.isMarkDownFile()) {
    if (task.beforeText.trim().startsWith('- [ ]')) {
      if (doneList === task.list) {
        if (modify) {
          task.beforeText = task.beforeText.replace('[ ]', '[x]')
          beforeTextModified = true
        } else {
          task.list = config.getDefaultList()
        }
      }
    } else if (task.beforeText.trim().startsWith('- [x]')) {
      if (doneList !== task.list) {
        if (modify) {
          task.beforeText = task.beforeText.replace('[x]', '[ ]')
          beforeTextModified = true
        } else {
          task.list = config.getDoneList()
        }
      }
    }

    if (_get(config, 'settings.cards.trackChanges') && task.hasListChanged(lists)) {
      const list = task.list
      const now = (new Date()).toISOString()
      content = task.addToLastCommentInContent(content, `${list}:${now}`, File.isMetaNewLine(config))
      if (!task.meta[list]) task.meta[list] = []
      task.meta[list].push(now)
    }

    if (doneList !== task.list && task.meta.completed && task.meta.completed.length > 0) {
      content = task.removeFromContent(content, `completed:${task.meta.completed[0]}`)
    }
  }

  return {content, beforeTextModified}
}

File.prototype.transformTasks = function (config, modify) {
  if (this.isCodeFile()) return
  fastSort(this.getTasks()).by({desc: 'line'}).forEach(task => {
    let content = task.content.toString()

    const trackListChanges = this.trackListChanges({task, content, config, modify})
    content = trackListChanges.content
    content = File.parseDueDate(content)
    content = File.addCompleted({task, content, config})
        
    if (content === task.content && !trackListChanges.beforeTextModified) return

    this.modifyTaskFromContent(task, content, config, true)
    task.parseTodoTxt()
  })
}

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

File.prototype.extractAndTransformTasks = function(config) {
  this.extractTasks(config)
  this.transformTasks(config)
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

File.prototype.extractHashStyleTasks = function(config, pos, content) {
  var hashStyleRegex = new RegExp(HASH_STYLE_PATTERN);
  var lang = this.getLang()
  var result;
  while((result = hashStyleRegex.exec(content)) !== null) {
    var [rawTask, list, order, text] = result;
    if (!config.listExists(list)) continue
    const posInContent = result.index + pos
    const line = this.getLineNumber(posInContent);
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
    const posInContent = result.index + pos
    const line = this.getLineNumber(posInContent);
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
    let [match, before, rawTask, text, list, colon, order] = result
    const beforeLength = before ? before.length : 0
    const posInContent = result.index + pos + beforeLength
    var line = this.getLineNumber(posInContent);
    if (self.hasTaskAtLine(line)) continue
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

File.prototype.extractCheckboxTasks = function(config, pos, content) {
  if (!this.isMarkDownFile()) return
  if (!config.isAddCheckBoxTasks()) return
  
  const type = Task.Types[config.getNewCardSyntax()]
  const order = 0
  const checkStyleRegex = new RegExp(CHECK_STYLE_PATTERN)
  let result
  let tasks = []
  while((result = checkStyleRegex.exec(content)) !== null) {
    let [match, before, checked, text] = result
    const list = checked.trim() === 'x'
      ? config.getDoneList()
      : config.getDefaultList()
    const beforeLength = before.length
    const posInContent = result.index + pos + beforeLength
    var line = this.getLineNumber(posInContent);
    if (this.hasTaskAtLine(line)) continue
    var task = this.newTask({config, list, text, order, line, type, hasColon: true, content: content.substring(result.index), pos: posInContent});
    task.rawTask = File.getRawTask(type, text, list, order);
    tasks.push(task)
  }

  if (tasks) {
    function hasTaskAtLine (line) {
      return tasks.find(task => {
        const lastLine = task.line + task.description.length
        return line > task.line && line <= lastLine
      })
    }
  
    tasks = tasks.filter(task => {
      return !hasTaskAtLine(task.line)
    })
    if (!tasks) return
    tasks.reverse().forEach(task => {
      this.addTask(task)
      content = this.content.substring(0, task.pos) 
      + task.rawTask 
      + content.substring(task.pos + task.text.length)
      this.emit("task.found", task);
    })

    if (this.content === content || !content) return
    
    this.content = content
    
    this.setModified(true)
  }
}

File.getRawTask = function(type, text, list, order) {
  const TYPES = Task.Types
  if (type === TYPES.MARKDOWN) {
    return `[${text}](#${list}:${order})`
  } else if (type  === TYPES.HASH_META_ORDER) {
    return `#${list} ${text}`
  }

  return `#${list}:${order} ${text}`
}

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
  this.extractHashStyleTasks(config, 0, this.getContent());
  this.extractHashStyleTasksNoOrder(config, 0, this.getContent());
  this.extractLinkStyleTasks(config, 0, this.getContent());
  this.extractCheckboxTasks(config, 0, this.getContent())
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
    if (this.tasksMatch(task, line, text)) {
      if (task.updatedText) task.text = task.updatedText 
      const linePos = this.getLinePos(line)
      var index = result.index;
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, linePos);
      var afterContent = this.getContent().substring(re.lastIndex);
      text = task.text;
      var taskContent = `${task.beforeText}#${task.list} ${task.text}`
      task.line = this.getLineNumber(index)
      task.id = getTaskId(self.getPath(), task.line, task.text);
      this.setContent(beforeContent + taskContent + afterContent);
      if (noEmit !== 'fromContent') {
        const newLine = File.isMetaNewLine(config)
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
    var text = result[ task.type === Task.Types.HASHTAG ? 3 : 5 ];
    var taskText = this.trimCommentBlockEnd(text);
    if (this.tasksMatch(task, line, taskText)) {
      if (task.updatedText) task.text = task.updatedText 
      var index = result.index;
      const pos = this.isCodeFile() ? index : this.getLinePos(line)
      if (index < 0) index = 0;
      var beforeContent = this.getContent().substring(0, pos);
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
      var order = task.order || ''
      var taskContent = `${task.beforeText || ''}${hash}${task.list}${task.hasColon ? ":" : ""}${order} ${text}`
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

    var rawTaskStart = result.index // before ? result.index + before.length : result.index;
    if (this.tasksMatch(task, line, text)) {
      // console.log('*** updatedText:', task.updatedText)
      if (task.updatedText) task.text = task.updatedText 
      const linePos = this.getLinePos(line)
      var beforeContent = this.getContent().substring(0, linePos);
      var afterContent = this.getContent().substring(re.lastIndex);
      var taskContent = `${task.beforeText}[${task.text}](#${task.list}:${task.order || ''})`
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

File.prototype.modifyTaskFromContent = function(task, content, config, noEmit) {
  updateTaskContent({task, content})
  this.modifyTask(task, config, 'fromContent')
};

File.prototype.modifyDescription = function(task, config) {
  // TODO respect indent of preFix when task is a list item
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
  let description = task.description.map(desc => `${spaces}${descriptionStartsWith}${desc}`)
  // TODO Allow this to pad for code files as well
  description = File.padDescription(description, task.beforeText).join(lf)
  if (rawDescription.length === 0  && description.length > 0) {
    beforeDescContent += description+lf
  } else {
    if (preserveBlankLines) {
      rawDescription.unshift(START_TAG)
      if (hasCardEndTag) rawDescription.push(END_TAG)
    }
    rawDescription = rawDescription.join(lf)
    if (this.isMarkDownFile() && description.length > 0 && (tools.hasBlankLines(description) || hasCardEndTag)) {
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

File.padDescription = function(description = [], beforeText = '') {
  return Task.padDescription(description, beforeText)
}

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
    // TODO:0.46875 ## add beforeText for code files
    const beforeText = this.getBeforeText(line, pos)
    let { rawDescription, preserveBlankLines } = this.getRawDescription({config, content, inCodeBlock, beforeText})

    if (!singleLineBlockComment) {
      description = this.isCodeFile() ? rawDescription.map(line => this.trimCommentChars(line)) : _clone(rawDescription)
    }
    description = Task.trimDescription(description, beforeText)
    // console.log(description)
    const descriptionStartsWith = this.getDescriptionChars(inCodeBlock)
    const frontMatter = this.frontMatter
    text = this.trimCommentBlockEnd(text)
    let commentStartOnLine = content.search(/\w/) - (descriptionStartsWith.length + 1)
    if (descriptionStartsWith === lang.symbol) commentStartOnLine = taskStartOnLine

    var task = new Task({
      pos,
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

File.prototype.tasksMatch = function(task, line, taskText) {
  return (task.id == getTaskId(this.getPath(), line, taskText) ||
          (task.meta.id && Task.getMetaData(taskText).id && (task.meta.id[0] === Task.getMetaData(taskText).id[0]))
        );
};

File.prototype.hasTaskAtLine = function(line) {
  return this.getTasks().find(task => {
    const lastLine = task.line + task.description.length
    return line >= task.line && line <= lastLine
  })
}

File.prototype.getLinePos = function(lineNo) {
  return Task.getLinePos(this.content, lineNo)
};

File.prototype.getLineNumber = function(pos, content = this.content) {
  return Task.getLineNumber(content, pos);
};

File.prototype.toJSON = function() {
  return _omit(this, ["domain", "_events", "_maxListeners"]);
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
  this.content = content
  return this;
};

File.prototype.setContentFromFile = function(content) {
  this.hasWindowsEOL = File.hasWindowsEOL(content)
  this.content = eol.lf(content || '');
  return this;
};

File.prototype.getContent = function() {
  return this.content
};

File.prototype.getContentForFile = function() {
  if (this.hasWindowsEOL && os.EOL === String(eol.crlf)) return eol.auto(this.content || '')
  return eol.lf(this.content || '');
};

File.prototype.getContentLines = function () {
  return eol.split(this.getContentForFile())
}

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

File.prototype.getModifiedTime = function() {
  return this.modifiedTime;
};

File.prototype.setModified = function(modified) {
  this.modified = modified;
  return this;
};

File.prototype.isModified = function() {
  return this.modified;
};

File.prototype.getType = function() {
  return this.constructor.name;
};

File.prototype.getTasks = function() {
  return this.tasks;
};

File.prototype.getTask = function(id) {
  return this.getTasks().find(task => id === task.id) ||
  this.getTasks().find(task => task.meta && task.meta.id && task.meta.id[0] === id.toString());
};

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

File.prototype.isMarkDownFile = function() {
  return /^md|markdown$/i.test(this.getExt())
};

File.prototype.getLang = function() {

  var lang = this.languages[path.extname(this.path)];
  return lang || {name:"text",symbol:""};
};

File.prototype.getExt = function() {
  return path.extname(this.path).substring(1).toLowerCase();
};

File.prototype.isCodeFile = function() {
  var symbol = this.getLang().symbol;
  return (symbol && symbol !== "");
};

File.prototype.getBeforeText = function(line, pos) {
  return this.isCodeFile() ? null : this.content.substring(this.getLinePos(line), pos)
}

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
    if (this.isCheckBoxTask(config, line, beforeText)) break
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

File.prototype.isCheckBoxTask = function(config, line, beforeText) {
  if (!config.isAddCheckBoxTasks()) return
  
  const beforeTextCheckData = Task.getCheckedData(beforeText)
  if (!beforeTextCheckData) return

  const lineCheckData = Task.getCheckedData(line)
  if (!lineCheckData) return

  return lineCheckData.pad <= beforeTextCheckData.pad
}

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
  return (
    this.hasCodeStyleTask(config, text)
      || (
          new RegExp(HASH_STYLE_PATTERN).test(text)
          || new RegExp(HASH_STYLE_META_ORDER_PATTERN).test(text)
          || new RegExp(LINK_STYLE_PATTERN).test(text))
          && config.lists.find(list => text.includes(`#${list.name}`)
        )
    );
};

File.prototype.isInCodeBlock = function(content) {
  if (!this.isCodeFile()) return false
  const lang = this.getLang()
  return (lang.block && lang.block.start && content.trim().startsWith(lang.block.start))
}

File.prototype.startsWithCommentOrSpace = function(pos) {
  var lang = this.getLang();
  var symbol = lang.symbol;
  var blockStart = lang.block && lang.block.start;
  if (symbol === this.getContent().substring((pos - symbol.length), pos)) return true;
  if (blockStart && blockStart === this.getContent().substring((pos - blockStart.length), pos)) return true;
  if (this.getContent().substring(pos-1, pos) === ' ') return true;
  return false;
};

File.prototype.isSingleLineBlockComment = function (content) {
  return eol.split(content).length === 1
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
      if (data.context) {
        this.frontMatter.context = Array.isArray(data.context) 
        ? data.context.map(context => context.trim())
        : data.context.toString().split(',').map(context => context.trim())
      }
      if (data.tags) {
        this.frontMatter.tags = Array.isArray(data.tags) 
        ? data.tags.map(tag => tag.trim())
        : data.tags.toString().split(',').map(tag => tag.trim())
      }
    }
  } catch (err) {
    console.error(`Error processing front-matter in:${this.path}`, err)
  }
}

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

module.exports = File;
