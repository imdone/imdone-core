'use strict'

var _clone = require('lodash.clone'),
  _isObject = require('lodash.isobject'),
  _assign = require('lodash.assign'),
  _omit = require('lodash.omit'),
  _get = require('lodash.get'),
  crypto = require('crypto'),
  events = require('events'),
  util = require('util'),
  path = require('path'),
  matter = require('gray-matter'),
  eol = require('eol'),
  lf = String(eol.lf),
  lineEnd = String(eol.auto),
  tools = require('./tools'),
  log = require('debug')('imdone-core:File'),
  chrono = require('chrono-node'),
  Task = require('./task'),
  newCard = require('./card'),
  fastSort = require('fast-sort/dist/sort'),
  XRegExp = require('xregexp'),
  { getIsoDateWithOffset } = require('./adapters/date-time'),
 {
  FILE_TYPES, 
  getTaskContent,
  getRawTask,
  LIST_NAME_PATTERN,
  HASH_STYLE_REGEX,
  HASH_STYLE_META_ORDER_REGEX,
  LINK_STYLE_REGEX,
 } = require('./adapters/parsers/task/CardContentParser')

const appContext = require('./context/ApplicationContext')
const { hasBlankLines } = require('./tools')

const ERRORS = {
  NOT_A_TASK: 'task must be of type Task',
}
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
  events.EventEmitter.call(this)
  this.project = opts.project
  this.projectContext = appContext().projectContext
  if (_isObject(opts.file) && _isObject(opts.config)) {
    _assign(this, opts.file)
    this.tasks.forEach((task) => {
      task = newCard(task, this.project)
    })
  } else {
    this.repoId = opts.repoId
    this.path = opts.filePath
    this.content = opts.content
    this.modifiedTime = opts.modifiedTime
    this.createdTime = opts.createdTime
    this.languages = opts.languages || require('./languages')
    this.modified = false
    this.frontMatter = {
      tags: [],
      context: [],
      meta: {},
    }
    this.tasks = []
    this.isDir = false
    this.lineCount = 0
    this.deleted = false
  }
}
util.inherits(File, events.EventEmitter)
const CODE_BLOCK_REGEX = (File.CODE_BLOCK_REGEX = /`{3}[\s\S]*?`{3}/gm)
const INLINE_CODE_REGEX = (File.INLINE_CODE_REGEX = /`[\s\S]*?`/g)
const CODE_STYLE_END = '((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$'

const CODE_STYLE_PATTERN = (File.CODE_STYLE_PATTERN =
  '([A-Z]+[A-Z-_]+?)' + CODE_STYLE_END)

File.isListNameValid = function(listName) {
  return new XRegExp(LIST_NAME_PATTERN).test(listName)
}

const CHECK_STYLE_PATTERN = (File.CHECK_STYLE_PATTERN =
  /^(\s*- \[([x ])\]\s)(.+$)/gm)

var getTaskId = (File.getTaskId = function (path, line, text) {
  var shasum = crypto.createHash('sha1')
  const taskElements = { path, line, text: text.trim() }
  shasum.update(JSON.stringify(taskElements))
  return shasum.digest('hex')
})

function getDoneList(config) {
  return config.getDoneList()
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

File.getUnixContent = function (content) {
  return content.replace(/\r\n|\r/g, '\n')
}

File.isMetaNewLine = function (config) {
  return config.isMetaNewLine()
}

File.isAddCompletedMeta = function (config) {
  return config.isAddCompletedMeta()
}

File.isFile = function (file) {
  return file instanceof File
}

File.isMarkdown = function (relPath) {
  return /\.md$/i.test(relPath) || path.extname(relPath) === ''
}

File.addCompleted = function ({ task, content, config }) {
  const doneList = getDoneList(config)
  if (
    !task ||
    !config ||
    !config.settings ||
    !doneList ||
    !this.isAddCompletedMeta(config)
  )
    return content
  if (task.list !== doneList) return content
  if (task.completed || task.meta.completed) return content
  if (content.includes(`completed${config.getMetaSep()}`)) return content
  const now = getIsoDateWithOffset()
  content = task.addToLastCommentInContent(
    content,
    `completed${config.getMetaSep()}${now}`,
    File.isMetaNewLine(config)
  )
  const lines = eol.split(content)
  return lines.join(lineEnd)
}

File.parseDueDate = function (config, text) {
  return File.parseDate(config, text, 'due')
}

File.parseRemindDate = function (config, text) {
  return File.parseDate(config, text, 'remind')
}

File.parseDeferDate = function (config, text) {
  return File.parseDate(config, text, 'defer')
}

File.parseDate = function (config, text, dateType) {
  if (text.includes(`${dateType}${config.getMetaSep()}`)) return text
  let dateString
  return text.replace(new RegExp(`(\\s${dateType})\\s.*?\\.`,'gi'), (match, p1) => {
    if (dateString) return match
    try {
      const date = chrono.parseDate(match, new Date(), {forwardDate: true})
      if (!date) return match
      dateString = getIsoDateWithOffset(date)
      return `${p1.toLowerCase()}${config.getMetaSep()}${dateString}`
    } catch (e) {
      console.log(`Unable to parse ${dateType} date for ${text}`)
      return match
    }
  })
}

function trackMarkdownChecklistChanges({task, config, modify}) {
  const doneList = config.getDoneList()
  let beforeTextModified = false
  if (task.beforeText.trim().startsWith('- [ ]')) {
    if (task.list === doneList) {
      if (modify) {
        task.beforeText = task.beforeText.replace('[ ]', '[x]')
        beforeTextModified = true
      } else {
        task.list = config.getDefaultList()
      }
    }
  } else if (task.beforeText.trim().startsWith('- [x]')) {
    if (task.list !==  doneList) {
      if (modify) {
        task.beforeText = task.beforeText.replace('[x]', '[ ]')
        beforeTextModified = true
      } else {
        task.list = doneList
      }
    }
  }

  return beforeTextModified
}

File.prototype.trackListChanges = function ({ task, content, config, modify }) {
  const lists = config.lists
    .filter((list) => !list.filter)
    .map((list) => list.name)

  const doneList = getDoneList(config)
  let beforeTextModified = false
  if (this.isMarkDownFile()) {
    beforeTextModified = trackMarkdownChecklistChanges({task, config, modify})
    
    if (
      _get(config, 'settings.cards.trackChanges') &&
      task.hasListChanged(lists)
    ) {
      const list = task.list
      const now = new Date().toISOString()
      content = task.addToLastCommentInContent(
        content,
        `${list}${config.getMetaSep()}${now}`,
        File.isMetaNewLine(config)
      )
      if (!task.meta[list]) task.meta[list] = []
      task.meta[list].push(now)
    }

    if (
      doneList !== task.list &&
      task.meta.completed &&
      task.meta.completed.length > 0
    ) {
      content = this.removeMetaData(
        content,
        'completed',
        task.meta.completed[0]
      )
    }
  }

  return { content, beforeTextModified }
}

File.prototype.removeMetaData = function (content, key, value) {
  return Task.removeMetaData({
    config: this.projectContext.config,
    content,
    key,
    value,
  })
}

File.prototype.transformTask = function ({config, modify, task}) {
  let content = task.content

  const trackListChanges = this.trackListChanges({
    task,
    content,
    config,
    modify,
  })
  content = trackListChanges.content
  content = File.parseDueDate(config, content)
  content = File.parseRemindDate(config, content)
  content = File.parseDeferDate(config, content)
  content = File.addCompleted({ task, content, config })
  content = task.format(content)
  if (
    content.trim() !== task.content.trim() 
    || trackListChanges.beforeTextModified
    || task.orderModified
  ) {
    this.modifyTaskFromContent(task, content, config)
  }
}

File.prototype.transformTasks = function (config, modify) {
  if (this.isCodeFile()) return
  fastSort(this.getTasks())
    .desc(u => u.line)
    .forEach(task => this.transformTask({config, modify, task}))
}

File.prototype.extractCodeStyleTasks = function (config, pos, content) {
  var self = this
  var codeStyleRegex = new RegExp(CODE_STYLE_PATTERN, 'gm')
  var result
  const inBlockComment = this.isInBlockComment(content)
  const singleLineBlockComment =
    inBlockComment && this.isSingleLineBlockComment(content)
  while ((result = codeStyleRegex.exec(content)) !== null) {
    var posInContent = pos + result.index
    var line = this.getLineNumber(posInContent)
    if (self.hasTaskAtLine(line)) continue
    var charBeforeList = this.getContent().substring(
      posInContent - 1,
      posInContent
    )
    if (this.startsWithCommentOrSpace(posInContent) && charBeforeList !== '#') {
      var list = result[1]
      if (!config.includeList(list)) continue
      var rawTask = result[0]
      var text = result[5]
      const linePos = self.getLinePos(line)
      const matchCharsInFront = this.getContent()
        .substring(linePos, posInContent)
        .match(/\S+\s*/)
      const charsInFront = matchCharsInFront ? matchCharsInFront[0].length : 0
      var hasColon =
        result[3] !== undefined
      const taskStartOnLine = inBlockComment
        ? posInContent - charsInFront - linePos
        : pos - linePos
      var task = self.extractTaskWithDescription({
        taskStartOnLine,
        rawTask,
        config,
        list,
        text,
        line,
        type: Task.Types.CODE,
        hasColon,
        content: self.getContent().substring(linePos),
        inBlockComment,
        singleLineBlockComment,
      })
      self.addTask(task)
      self.emit('task.found', task)
    }
  }
}

File.prototype.extractHashStyleTasks = function (config, pos, content) {
  var hashStyleRegex = new XRegExp(HASH_STYLE_REGEX)
  var lang = this.getLang()
  var result
  while ((result = hashStyleRegex.exec(content)) !== null) {
    var [rawTask, list, orderGroup, order, text] = result
    if (!config.listExists(list)) continue

    const posInContent = result.index + pos
    if (this.hasCodeSpanOrBlockAtPos(posInContent)) continue
    
    const line = this.getLineNumber(posInContent)
    if (this.hasTaskAtLine(line)) continue

    if (lang.block) {
      const blockEndPos = text.indexOf(lang.block.end)
      if (blockEndPos > -1) text = text.substring(0, blockEndPos)
    }
    var task = this.extractTaskWithDescription({
      config,
      list,
      text,
      order,
      line,
      type: Task.Types.HASHTAG,
      hasColon: orderGroup && orderGroup.startsWith(':'),
      content: content.substring(result.index),
      pos: posInContent,
    })
    task.taskStartOnLine = pos - this.getLinePos(line)
    task.rawTask = rawTask
    this.addTask(task)
    this.emit('task.found', task)
  }
}

File.prototype.extractLinkStyleTasks = function (config, pos, content) {
  var self = this
  var linkStyleRegex = new XRegExp(LINK_STYLE_REGEX)
  var result
  while ((result = linkStyleRegex.exec(content)) !== null) {
    let [match, before, rawTask, text, list, colon, order] = result
    const beforeLength = before ? before.length : 0
    const posInContent = result.index + pos + beforeLength
    if (this.hasCodeSpanOrBlockAtPos(posInContent)) continue
    var line = this.getLineNumber(posInContent)
    if (self.hasTaskAtLine(line)) continue
    if (!config.listExists(list)) continue
    log = require('debug')('extractLinkStyleTasks')
    log('*********************************************************')
    log(result)
    log('list:%s text:%s order:%d line:%d', list, text, order, line)

    var task = self.extractTaskWithDescription({
      config,
      list,
      text,
      order,
      line,
      type: Task.Types.MARKDOWN,
      hasColon: !!colon,
      content: content.substring(result.index),
      pos: posInContent,
    })
    task.rawTask = rawTask
    self.addTask(task)
    self.emit('task.found', task)
  }
}

File.prototype.extractCheckboxTasks = function (config, pos, content) {
  if (!this.isMarkDownFile()) return
  if (!config.isAddCheckBoxTasks()) return

  const type = Task.Types[config.getNewCardSyntax()]
  const checkStyleRegex = new RegExp(CHECK_STYLE_PATTERN)
  let result
  let tasks = []
  const hasTaskAtLine = (line) => {
    return (
      this.hasTaskAtLine(line) ||
      tasks.find((task) => {
        return line >= task.line && line <= task.lastLine
      })
    )
  }
  while ((result = checkStyleRegex.exec(content)) !== null) {
    let [match, before, checked, text] = result
    const list =
      checked.trim() === 'x' ? config.getDoneList() : config.getDefaultList()
    const beforeLength = before.length
    const posInContent = result.index + pos + beforeLength
    var line = this.getLineNumber(posInContent)
    if (hasTaskAtLine(line)) continue
    var task = this.extractTaskWithDescription({
      config,
      list,
      text,
      line,
      type,
      hasColon: true,
      content: content.substring(result.index),
      pos: posInContent,
    })
    task.rawTask = getRawTask(type, text, list, task.order)
    tasks.push(task)
  }
  if (tasks) {
    const hasTaskAtLine = (line) => {
      return (
        this.hasTaskAtLine(line) ||
        tasks.find((task) => {
          return line > task.line && line <= task.lastLine
        })
      )
    }
    tasks = tasks.filter((task) => {
      return !hasTaskAtLine(task.line)
    })
    if (!tasks) return
    let newContent = content
    tasks.reverse().forEach((task) => {
      this.addTask(task)
      const beforeTaskContent = content.substring(0, task.pos)
      const afterTaskContent = newContent.substring(task.pos + task.text.length)
      newContent = beforeTaskContent + task.rawTask + afterTaskContent
      this.emit('task.found', task)
    })

    if (this.content === newContent || !newContent) return

    this.content = newContent

    this.setModified(true)
    console.log('extractCheckboxTasks setModified true for file:', this.path)

  }
}

File.prototype.extractTasks = function (config) {
  this.tasks = []
  if (this.isMarkDownFile()) {
    const data = this.parseFrontMatter(config)
    if (data.imdone_ignore || data['kanban-plugin']) return this
  }
  if (this.isCodeFile()) {
    this.extractTasksInCodeFile(config)
  } else {
    this.extractTasksInNonCodeFile(config)
  }
  return this
}

File.prototype.extractAndTransformTasks = function (config) {
  this.extractTasks(config)
  this.transformTasks(config)
}

File.prototype.extractTasksInCodeFile = function (config) {
  var self = this
  var commentRegex = this.getCodeCommentRegex()
  var result
  while ((result = commentRegex.exec(self.getContent())) !== null) {
    var comment = result[0]
    var commentStart = result.index
    self.extractCodeStyleTasks(config, commentStart, comment)
  }
}

File.prototype.extractTasksInNonCodeFile = function (config) {
  this.codeSpanAndBlockPositions = File.getCodePositions(this.getContent())
  this.extractHashStyleTasks(config, 0, this.getContent())
  this.extractLinkStyleTasks(config, 0, this.getContent())
  this.extractCheckboxTasks(config, 0, this.getContent())
}

File.prototype.deleteBlankLine = function (lineNo) {
  var startOfLine = this.getLinePos(lineNo)
  if (this.isMarkDownFile()) startOfLine = startOfLine - 1
  var startOfNextLine = this.getLinePos(lineNo + 1)
  if (startOfNextLine < 0) return
  var content = this.content
  var lineContent = content.substring(startOfLine, startOfNextLine)
  const trimmedLine = lineContent.trim()
  if (
    trimmedLine === '' ||
    (this.isMarkDownFile() && /^(-|\*+|\#+)$/.test(trimmedLine))
  ) {
    var start = content.substring(0, startOfLine)
    var end = content.substring(startOfNextLine)
    this.setContent(start + end)
  }
}

File.prototype.deleteTaskContent = function (beforeContent, afterContent) {
  const lang = this.getLang()
  if (this.isCodeFile() && lang.block) {
    const beforeContentTrim = beforeContent.trim()
    const blockStartTrimPos = beforeContentTrim.lastIndexOf(lang.block.start)
    if (
      blockStartTrimPos > -1 &&
      blockStartTrimPos === beforeContentTrim.length - lang.block.start.length
    ) {
      const blockStartPos = beforeContent.lastIndexOf(lang.block.start)
      const blockEndPos =
        afterContent.indexOf(lang.block.end) + lang.block.end.length
      beforeContent = beforeContent.substring(0, blockStartPos)
      afterContent = afterContent.substring(blockEndPos)
    }
  }

  this.setContent(beforeContent + afterContent)
}

File.prototype.deleteDescription = function (task, config) {
  if (task.singleLineBlockComment) return
  task.description = []
  this.modifyDescription(task, config)
}

File.prototype.deleteCodeOrHashTask = function (re, task, config) {
  var log = require('debug')('delete-task:deleteCodeOrHashTask')
  var self = this
  var line = task.getLine()
  re = new XRegExp(re)
  re.lastIndex = this.getLinePos(line)
  var result = re.exec(this.getContent())
  if (result) {
    log('Got result: %j', result)
    var lang = self.getLang()
    var text = result[task.type === Task.Types.HASHTAG ? 4 : 5]
    var taskText = this.trimCommentBlockEnd(text)
    if (this.tasksMatch(config, task, line, taskText)) {
      var index = result.index
      var afterStart = re.lastIndex
      if (index < 0) index = 0
      if (self.isCodeFile()) {
        var commentStart = this.getLinePos(line) + task.taskStartOnLine
        var commentPrefix = this.getContent().substring(commentStart, index)
        var symbolRe = new RegExp(escapeRegExp(lang.symbol) + '\\s*')
        if (symbolRe.test(commentPrefix)) index = commentStart
        else if (lang && lang.block && lang.block.end) {
          var blockEndRe = new RegExp(escapeRegExp(lang.block.end) + '\\s*$')
          var match = blockEndRe.exec(task.rawTask)
          if (match) afterStart -= match[0].length
        }
      }
      var beforeContent = this.getContent().substring(0, index)
      var afterContent = this.getContent().substring(afterStart)
      this.deleteTaskContent(beforeContent, afterContent)
      this.deleteBlankLine(line)
      this.setModified(true)
      // task.type = Task.Types.HASHTAG;
      this.emit('task.deleted', task)
      this.emit('file.modified', self)
    }
  }

  return this
}

File.prototype.deleteTask = function (task, config) {
  var self = this
  if (this.isCodeFile()) {
    this.deleteDescription(task, config)
    if (task.type === Task.Types.CODE) {
      this.deleteCodeOrHashTask(
        new RegExp(CODE_STYLE_PATTERN, 'gm'),
        task,
        config
      )
    } else if (task.type === Task.Types.HASHTAG) {
      this.deleteCodeOrHashTask(HASH_STYLE_REGEX, task, config)
    }
  } else {
    const fileContent = this.getContentLines()
    const newContent = [
      ...fileContent.slice(0, task.line - 1),
      ...fileContent.slice(task.lastLine),
    ]
    this.setContent(newContent.join(lineEnd))
    this.setModified(true)
    this.emit('task.deleted', task)
    this.emit('file.modified', self)
  }
}

File.prototype.modifyTask = function (task, config, noEmit) {
  task.orderModified = true
  task.updateOrderMeta(config)
  if (task.type === Task.Types.CODE) {
    this.modifyCodeOrHashTask(
      new RegExp(CODE_STYLE_PATTERN, 'gm'),
      task,
      config,
      noEmit
    )
  } else {
    task.updateContent()
    const fileContent = this.getContentLines()
    let text = getRawTask({
      orderMeta: config.orderMeta,
      beforeText: task.beforeText,
      hasColon: task.hasColon,
      list: task.list,
      order: task.order,
      text: task.text,
      type: task.type,
    })
    const linesBefore = fileContent.slice(0, task.line - 1)
    if (this.isCodeFile()) {
      const linesBeforeLength = linesBefore.join(lineEnd).length
      const charsBefore = task.pos - (linesBeforeLength + 1)
      if (charsBefore > 0) {
        text = fileContent[task.line -1].substring(0,charsBefore) + text
      }
    }

    const linesAfter = fileContent.slice(task.line)
    const newContent = [
      ...linesBefore,
      text,
      ...linesAfter,
    ].join(lineEnd)

    const contentBeforeUpdate = this.getContent()
    this.setContent(newContent)
    this.modifyDescription(task, config)
    if (contentBeforeUpdate.trim() == this.getContent().trim()) return

    this.setModified(true)
    if (!noEmit) {
      this.emit('task.modified', task)
      this.emit('file.modified', this)
    }
  }
}

File.prototype.modifyCodeOrHashTask = function (re, task, config, noEmit) {
  log('In modifyCodeOrHashTask:%j', task)
  log('--------------------------------')
  log(`modifying task: ${task.rawTask}`)
  log(`line: ${task.line}`)
  var self = this
  var line = task.getLine()
  re = new RegExp(re)
  var lang = this.getLang()
  var linePos = (re.lastIndex = this.getLinePos(line))
  var nextLinePos = this.getLinePos(line + 1)
  var lineContent = this.getContent().substring(linePos, nextLinePos)
  if (lineContent.indexOf(lang.symbol) > -1) {
    re.lastIndex = this.getContent().indexOf(lang.symbol, linePos)
  }
  if (lang.block && lineContent.indexOf(lang.block.start) > -1) {
    re.lastIndex = this.getContent().indexOf(lang.block.start, linePos)
  }

  var result
  while ((result = re.exec(this.getContent())) !== null) {
    log('Got result: %j', result)
    var text = result[task.type === Task.Types.HASHTAG ? 3 : 5]
    var taskText = this.trimCommentBlockEnd(text)
    if (this.tasksMatch(config, task, line, taskText)) {
      if (task.updatedText) task.text = task.updatedText
      var index = result.index
      const pos = this.isCodeFile() ? index : this.getLinePos(line)
      if (index < 0) index = 0
      var beforeContent = this.getContent().substring(0, pos)
      var afterContent = this.getContent().substring(re.lastIndex)
      if (task.inBlockComment) {
        var blockEnd = text.indexOf(lang.block.end)
        if (blockEnd > -1) {
          const desc =
            task.description.length > 0
              ? `${lineEnd}${task.description.join(lineEnd)}`
              : ''
          text = task.text + desc + text.substring(blockEnd)
        } else text = task.text
      } else text = task.text
      if (/[a-z]/.test(task.list)) task.type = Task.Types.HASHTAG
      const hash = task.type === Task.Types.HASHTAG ? '#' : ''
      const inLineOrder = task.hasColon && !config.orderMeta ? `:${task.order}` : ''
      var taskContent = `${task.beforeText || ''}${hash}${task.list}${inLineOrder} ${text}`
      task.line = this.getLineNumber(index)
      task.id = getTaskId(self.getPath(), task.line, task.text)
      this.setContent(beforeContent + taskContent + afterContent)
      if (!task.singleLineBlockComment) {
        this.modifyDescription(task, config)
      }
      this.setModified(true)
      console.log('modifyCodeOrHashTask setModified true for file:', this.path)
      if (!noEmit) {
        this.emit('task.modified', task)
        this.emit('file.modified', self)
      }
      return this
    }
  }

  return this
}

File.prototype.modifyTaskFromHtml = function (task, html) {
  const checks = task.getChecksFromHtml(html)
  const re = /- \[[\sx]{1}\]/g
  const descStart = this.getLinePos(task.line + 1)
  const descEnd = this.getLinePos(task.line + 1 + task.description.length)
  let descContent =
    descEnd > 0
      ? this.getContent().substring(descStart, descEnd)
      : this.getContent().substring(descStart)
  const beforeDescContent = this.getContent().substring(0, descStart)
  const afterDescContent =
    descEnd > 0 ? this.getContent().substring(descEnd) : ''
  let i = 0
  descContent = descContent.replace(re, (match) => {
    const check = checks[i]
    i++
    if (check === undefined) return match
    let char = check ? 'x' : ' '
    return `- [${char}]`
  })

  this.setContent(beforeDescContent + descContent + afterDescContent)
  this.setModified(true)
  console.log('modifyTaskFromHtml setModified true for file:', this.path)
}

File.prototype.modifyTaskFromContent = function (task, content, config) {
  content = trimBlankLines(content, this.isCodeFile())
  task.updateFromContent(content)
  this.modifyTask(task, config)
}

const trimBlankLines = File.trimBlankLines = function (content, isCodeFile) {
  if (isCodeFile) {
    // replace all occurrences of two empty lines in a row with a single empty line
    return content.replace(/\n\s*\n/g, '\n')
  } 
  return content.replace(/\n\s*\n\s*\n/g, '\n\n')
}

File.prototype.modifyDescription = function (task, config) {
  // TODO This should be split out by type (code, markdown, etc)
  // #urgent
  // <!-- order:-70 -->
  const taskStart = this.getLinePos(task.line)
  const descStart = this.getLinePos(task.line + 1)
  const contentWithTask = this.getContent().substring(taskStart)
  let { 
    rawTaskContentLines,
    taskContentLines,
    isWrappedWithCardTag,
    trailingBlankLines
  } =
    this.getTaskContent({
      config,
      content: contentWithTask,
      inBlockComment: task.inBlockComment,
      beforeText: task.beforeText,
    })

  let beforeDescContent = this.getContent().substring(0, descStart)

  if (descStart === this.getContent().length && !beforeDescContent.endsWith(lf))
    beforeDescContent += lineEnd
  
  let content = this.getContent().substring(descStart)
  let spaces = ''
  if (this.isCodeFile() && !this.isMarkDownFile()) {
    spaces = contentWithTask.substring(0, task.commentStartOnLine)
    spaces = spaces.replace(/\S/g, ' ')
  }
  const descriptionStartsWith = task.descriptionStartsWith
    ? `${task.descriptionStartsWith} `
    : ''
  let description = task.description.map(
    (desc) => `${spaces}${descriptionStartsWith}${desc}`
  )
  // BACKLOG:-30 Allow this to pad for code files as well
  description = File.padDescription(description, task.beforeText).join(lineEnd)
  if (taskContentLines.length === 0 && description.length > 0) {
    beforeDescContent += description + lineEnd
  } else {
    let rawTaskContent = rawTaskContentLines.join(lineEnd)
    // Add card terminator to description
    if (
      this.isMarkDownFile() &&
      description.length > 0 &&
      (hasBlankLines(description) || isWrappedWithCardTag || trailingBlankLines)
    ) {
      task.isWrappedWithCardTag = isWrappedWithCardTag // FIXME Find out where this is used and stop using it
                                                       // <!-- order:-30 -->
      const blankLinesToAdd = isWrappedWithCardTag ? 2 : trailingBlankLines
      description = `${description}${lineEnd.repeat(blankLinesToAdd)}`
    }

    // Handle code file tasks
    if (
      task.singleLineBlockComment &&
      rawTaskContent.length > 0 &&
      description.length === 0
    ) {
      description = lineEnd + description
    }
    content = content.replace(rawTaskContent, description)
  }

  task.lastLine = task.line + description.split(lineEnd).length
  this.setContent(beforeDescContent + content)
}

File.padDescription = function (description = [], beforeText = '') {
  return Task.padDescription(description, beforeText)
}

File.prototype.extractTaskWithDescription = function ({
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
  inBlockComment,
  singleLineBlockComment,
  pos,
}) {
  var self = this
  const lang = this.getLang()
  let description = []
  // BACKLOG:-230 ## add beforeText for code files
  const beforeText = this.getBeforeText(line, pos)
  let { rawTaskContentLines, taskContentLines, isWrappedWithCardTag } = this.getTaskContent({
    config,
    content,
    inBlockComment,
    beforeText,
  })

  if (!singleLineBlockComment) {
    description = this.isCodeFile()
      ? taskContentLines.map((line) => this.trimCommentChars(line))
      : _clone(taskContentLines)
  }
  description = Task.trimDescription(description, beforeText)
  const descriptionStartsWith = this.getDescriptionChars(inBlockComment)
  const frontMatter = this.frontMatter
  text = this.trimCommentBlockEnd(text)
  let commentStartOnLine =
    content.search(/\w/) - (descriptionStartsWith.length + 1)
  if (descriptionStartsWith === lang.symbol)
    commentStartOnLine = taskStartOnLine

  var task = newCard(
    {
      pos,
      frontMatter,
      inBlockComment,
      singleLineBlockComment,
      rawTask,
      text,
      list,
      rawTaskContentLines,
      description,
      descriptionStartsWith,
      taskStartOnLine,
      commentStartOnLine,
      hasColon,
      order: self.projectContext.getOrder(list, order),
      line,
      id: getTaskId(self.getPath(), line, text),
      repoId: self.getRepoId(),
      source: self.getSource(),
      type,
      beforeText,
      isWrappedWithCardTag,
    },
    this.project
  )

  task.updateOrderMeta(config)

  task.orderModified = task.order + "" !== order + "" && !bothAreUndefNull(task.order, order)
  task.init()

  return task
}

function bothAreUndefNull(a, b) {
  return isUndefNull(a) && isUndefNull(b)
}

function isUndefNull(val) {
  return val === null || val === undefined
}

File.prototype.tasksMatch = function (config, task, line, taskText) {
  return (
    task.id == getTaskId(this.getPath(), line, taskText) ||
    (task.meta.id &&
      Task.getMetaData(config, taskText).id &&
      task.meta.id[0] === Task.getMetaData(config, taskText).id[0])
  )
}

File.prototype.hasTaskAtLine = function (line) {
  return this.getTasks().find((task) => {
    return line >= task.line && line <= task.lastLine
  })
}

File.prototype.getLinePos = function (lineNo) {
  return Task.getLinePos(this.content, lineNo)
}

File.prototype.getLineNumber = function (pos, content = this.content) {
  return Task.getLineNumber(content, pos)
}

File.prototype.toJSON = function () {
  return _omit(this, ['domain', '_events', '_maxListeners'])
}

File.prototype.getRepoId = function () {
  return this.repoId
}

File.prototype.getPath = function () {
  return this.path
}

File.prototype.getFullPath = function () {
  return this.repoId + this.path
}

File.prototype.getId = function () {
  return this.getPath()
}

File.prototype.reset = function () {
  this.previousContent = this.content
  this.content = null
  return this
}

File.prototype.rollback = function () {
  this.content = this.previousContent
  return this
}

File.prototype.setContent = function (content) {
  this.content = content
  return this
}

File.prototype.setContentFromFile = function (content) {
  this.content = eol.auto(content || '')
  return this
}

File.prototype.getContent = function () {
  return this.content
}

File.prototype.getContentForFile = function () {
  return eol.auto(this.content || '')
}

File.prototype.getContentLines = function () {
  return eol.split(this.getContentForFile())
}

File.prototype.setModifiedTime = function (modifiedTime) {
  this.modifiedTime = modifiedTime
  return this
}

File.prototype.setCreatedTime = function (createdTime) {
  this.createdTime = createdTime
  return this
}

File.prototype.getCreatedTime = function () {
  return this.createdTime
}

File.prototype.getModifiedTime = function () {
  return this.modifiedTime
}

File.prototype.setModified = function (modified) {
  this.modified = modified
  return this
}

File.prototype.isModified = function () {
  return this.modified
}

File.prototype.getType = function () {
  return this.constructor.name
}

File.prototype.getTasks = function () {
  return this.tasks
}

File.prototype.getTask = function (id) {
  return (
    this.getTasks().find((task) => id === task.id) ||
    this.getTasks().find(
      (task) => task.meta && task.meta.id && task.meta.id[0] === id.toString()
    )
  )
}

File.prototype.addTask = function (task) {
  if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK)
  if (!Array.isArray(this.tasks)) this.tasks = []
  var index = this.tasks.findIndex(({ id }) => task.id === id)
  log(
    'Adding task with text:%s in list:%s with order:%d at index %d',
    task.text,
    task.list,
    task.order,
    index
  )
  if (index > -1) {
    this.tasks[index] = task
  } else {
    this.tasks.push(task)
  }
  return this
}

File.prototype.removeTask = function (task) {
  if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK)
  if (!Array.isArray(this.tasks)) this.tasks = []
  var index = this.tasks.findIndex(({ id }) => task.id === id)
  if (index > -1) {
    this.tasks.splice(index, 1)
  }
}

File.prototype.ignoreCodeBlocks = function () {
  // BACKLOG:-100 This is not used, but we need a way to ignore tasks in code blocks. Maybe save position ranges
  var cleanContent = this.content
  var replacer = function (block) {
    block = block.replace(new XRegExp(LINK_STYLE_REGEX), '**TASK**')
    block = block.replace(new XRegExp(HASH_STYLE_REGEX), '**TASK**')
    return block
  }

  if (this.isMarkDownFile()) {
    cleanContent = this.content
      .replace(new RegExp(CODE_BLOCK_REGEX), replacer)
      .replace(new RegExp(INLINE_CODE_REGEX), replacer)
  }
  return cleanContent
}

File.prototype.isMarkDownFile = function () {
  return /^md|markdown$/i.test(this.getExt())
}

File.prototype.getLang = function () {
  var lang = this.languages[path.extname(this.path)]
  return lang || { name: 'text', symbol: '' }
}

File.prototype.getExt = function () {
  return path.extname(this.path).substring(1).toLowerCase()
}

File.prototype.isCodeFile = function () {
  var symbol = this.getLang().symbol
  return symbol && symbol !== ''
}

File.prototype.getBeforeText = function (line, pos) {
  return this.isCodeFile()
    ? null
    : this.content.substring(this.getLinePos(line), pos)
}

File.prototype.getDescriptionChars = function (inBlockComment) {
  if (!this.isCodeFile()) return ''
  const lang = this.getLang()
  if (inBlockComment && lang.block && lang.block.ignore) return lang.block.ignore
  return lang.symbol
}

File.prototype.getTaskContent = function ({
  config,
  content,
  inBlockComment,
  beforeText,
}) {
  const isMarkDownFile = this.isMarkDownFile()
  const isCodeFile = this.isCodeFile()
  const lang = this.getLang()
  const fileType = isMarkDownFile ? FILE_TYPES.MARKDOWN : isCodeFile ? FILE_TYPES.CODE : undefined
  return getTaskContent({
    config,
    content,
    inBlockComment,
    beforeText,
    lang,
    fileType,
  })
}

File.prototype.isCheckBoxTask = function (config, line, beforeText) {
  if (!config.isAddCheckBoxTasks()) return

  const beforeTextCheckData = Task.getCheckedData(beforeText)
  if (!beforeTextCheckData) return

  const lineCheckData = Task.getCheckedData(line)
  if (!lineCheckData) return

  return lineCheckData.pad <= beforeTextCheckData.pad
}

File.prototype.getCodeCommentRegex = function () {
  // #BACKLOG:-460 Allow languages to have multiple block comment styles, like html gh:13 id:5
  var lang = this.getLang()
  var symbol = lang.symbol
  var reString = escapeRegExp(symbol) + '[^{].*$'

  if (lang.block) {
    var start = escapeRegExp(lang.block.start)
    var end = escapeRegExp(lang.block.end)
    //
    reString = reString + '|' + start + '(.|[\\r\\n])*?' + end
  }

  return new RegExp(reString, 'gmi')
}

File.prototype.trimCommentStart = function (text) {
  if (this.isCodeFile() && this.getLang().symbol) {
    var start = escapeRegExp(this.getLang().symbol)
    var startPattern = `^\\s*${start}\\s?`
    return text.replace(new RegExp(startPattern), '')
  }
  return text
}

File.prototype.trimCommentBlockEnd = function (text) {
  if (this.isCodeFile() && this.getLang().block) {
    var blockEnd = escapeRegExp(this.getLang().block.end)
    var endPattern = `\\s?${blockEnd}.*$`
    return text.replace(new RegExp(endPattern), '')
  }
  return text
}

File.prototype.trimCommentBlockStart = function (text) {
  if (this.isCodeFile() && this.getLang().block) {
    var blockStart = escapeRegExp(this.getLang().block.start)
    var startPattern = `^\\s*${blockStart}\\s?`
    return text.replace(new RegExp(startPattern), '')
  }
  return text
}

File.prototype.trimCommentBlockIgnore = function (text) {
  if (
    this.isCodeFile() &&
    this.getLang().block &&
    this.getLang().block.ignore
  ) {
    var blockIgnore = escapeRegExp(this.getLang().block.ignore)
    var ignorePattern = `^\\s*${blockIgnore}\\s?`
    return text.replace(new RegExp(ignorePattern), '')
  }
  return text
}

File.prototype.trimCommentChars = function (text) {
  let newText = this.trimCommentStart(text)
  if (text === newText) newText = this.trimCommentBlockEnd(text)
  if (text === newText) newText = this.trimCommentBlockStart(text)
  if (text === newText) newText = this.trimCommentBlockIgnore(text)
  return newText
}

File.prototype.hasCodeStyleTask = function (config, text) {
  if (!this.isCodeFile()) return false
  let result = new RegExp(CODE_STYLE_PATTERN).exec(text)
  if (!result) return false
  return config.includeList(result[1])
}

File.prototype.hasTaskInText = function (config, text) {
  return (
    this.hasCodeStyleTask(config, text) ||
    ((new XRegExp(HASH_STYLE_REGEX).test(text) ||
      new XRegExp(HASH_STYLE_META_ORDER_REGEX).test(text) ||
      new XRegExp(LINK_STYLE_REGEX).test(text)) &&
      config.lists.find((list) => text.includes(`#${list.name}`)))
  )
}

File.prototype.isInBlockComment = function (content) {
  if (!this.isCodeFile()) return false
  const lang = this.getLang()
  return (
    lang.block &&
    lang.block.start &&
    content.trim().startsWith(lang.block.start)
  )
}

File.prototype.startsWithCommentOrSpace = function (pos) {
  var lang = this.getLang()
  var symbol = lang.symbol
  var blockStart = lang.block && lang.block.start
  if (symbol === this.getContent().substring(pos - symbol.length, pos))
    return true
  if (
    blockStart &&
    blockStart === this.getContent().substring(pos - blockStart.length, pos)
  )
    return true
  if (this.getContent().substring(pos - 1, pos) === ' ') return true
  return false
}

File.prototype.isSingleLineBlockComment = function (content) {
  return eol.split(content).length === 1
}

File.prototype.parseFrontMatter = function (config) {
  this.frontMatter = {
    tags: [],
    context: [],
    meta: {},
  }

  if (config.ignoreFrontMatter) return {}
  try {
    const { data, isEmpty } = matter(this.getContent())
    if (!isEmpty) {
      this.frontMatter = { props: {}, ...data, ...this.frontMatter }
      if (data.meta) this.frontMatter.meta = getFrontMeta(data.meta)
      if (data.context) {
        this.frontMatter.context = Array.isArray(data.context)
          ? data.context.map((context) => context.trim())
          : data.context
              .toString()
              .split(',')
              .map((context) => context.trim())
      }
      if (data.tags && !config.ignoreFrontMatterTags) {
        this.frontMatter.tags = Array.isArray(data.tags)
          ? data.tags.map((tag) => tag.trim())
          : data.tags
              .toString()
              .split(',')
              .map((tag) => tag.trim())
      }
      return data
    }
  } catch (err) {
    console.error(`Error processing front-matter in:${this.path}`, err)
  }
  return {}
}

File.prototype.getSource = function () {
  var self = this
  return {
    path: self.getPath(),
    id: self.getId(),
    repoId: self.getRepoId(),
    type: self.getType(),
    ext: self.getExt(),
    lang: self.getLang().name,
    modified: self.isModified(),
    modifiedTime: self.getModifiedTime(),
    createdTime: self.getCreatedTime(),
  }
}

File.getCodePositions = function(content) {
  const regex = /```.*?```|`.*?`/gms
  const indicies = []
  let result
  while ((result = regex.exec(content)) !== null) {
    indicies.push([result.index, regex.lastIndex])
  }
  return indicies
}

File.prototype.hasCodeSpanOrBlockAtPos = function(pos) {
  const positions = this.codeSpanAndBlockPositions || File.getCodePositions(this.content)
  return positions.find(([start, end]) => pos > start && pos < end)
}

module.exports = File
