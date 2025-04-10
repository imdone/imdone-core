import _isObject from 'lodash.isobject'
import _assign from 'lodash.assign'
import _omit from 'lodash.omit'
import _get from 'lodash.get'
import crypto from 'crypto'
import Emitter from 'events'
import path from 'path'
import matter from 'gray-matter'
import eol from 'eol'
import { tools } from './tools.js'
import debug from 'debug'
import * as chrono from 'chrono-node'
import { Task } from './task.js'
import { newCard } from './card.js'
import { sort } from 'fast-sort'
import XRegExp from 'xregexp'
import { getIsoDateWithOffset } from './adapters/date-time.js'
import {
  FILE_TYPES,
  getTaskContent,
  getRawTask,
  getHashStyleRegex,
  hasTaskInText,
  LIST_NAME_PATTERN,
  LINK_STYLE_REGEX,
} from './adapters/parsers/task/CardContentParser.js'
import { appContext } from './context/ApplicationContext.js'
import { languages } from './languages.js'
import { logger } from './adapters/logger.js'

const log = debug('imdone-core:File')
const lf = String(eol.lf)
const lineEnd = String(eol.auto)
const { hasBlankLines, escapeRegExp } = tools
const ERRORS = {
  NOT_A_TASK: 'task must be of type Task',
}
const CODE_STYLE_END = '((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$'
const CODE_STYLE_PATTERN = '([A-Z]+[A-Z-_]+?)' + CODE_STYLE_END
const CHECK_STYLE_PATTERN = /^(\s*- \[([x ])\]\s)(.+$)/gm

function getTaskId (path, line, text) {
  var shasum = crypto.createHash('sha1')
  const taskElements = { path, line, text: text.trim() }
  shasum.update(JSON.stringify(taskElements))
  return shasum.digest('hex')
}

function getDoneList(config) {
  return config.getDoneList()
}

function getDoingList(config) {
  return config.getDoingList()
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

function trimBlankLines (content, isCodeFile) {
  if (isCodeFile) {
    // replace all occurrences of two empty lines in a row with a single empty line
    return content.replace(/\n\s*\n/g, '\n')
  } 
  return content.replace(/\n\s*\n\s*\n/g, '\n\n')
}

function padDescription (description = [], beforeText = '') {
  return Task.padDescription(description, beforeText)
}

function bothAreUndefNull(a, b) {
  return isUndefNull(a) && isUndefNull(b)
}

function isUndefNull(val) {
  return val === null || val === undefined
}



export class File extends Emitter {
  constructor(opts) {
    super()
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
      this.languages = opts.languages || languages
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
  
  static CODE_STYLE_PATTERN = CODE_STYLE_PATTERN
  
  static CHECK_STYLE_PATTERN = CHECK_STYLE_PATTERN

  static getTaskId = getTaskId

  static trimBlankLines = trimBlankLines

  static padDescription = padDescription
  
  static isListNameValid(listName) {
    return new XRegExp(LIST_NAME_PATTERN).test(listName)
  }

  static getUnixContent (content) {
    return content.replace(/\r\n|\r/g, '\n')
  }
  
  static isMetaNewLine (config) {
    return config.isMetaNewLine()
  }
  
  static isAddCompletedMeta (config) {
    return config.isAddCompletedMeta()
  }
  
  static isFile (file) {
    return file instanceof File
  }
  
  static isMarkdown (relPath) {
    return /\.md$/i.test(relPath) || path.extname(relPath) === ''
  }

  static addStarted ({ task, content, config }) {
    if (!task || !config || !config.settings) return content
    if (!config.settings.cards.addStartedMeta) return content
    if (task.meta.started) return content
    if (task.list !== getDoingList(config)) return content
    const now = getIsoDateWithOffset()
    content = task.addToLastCommentInContent(
      content,
      `started${config.getMetaSep()}${now}`,
      File.isMetaNewLine(config)
    )
    const lines = eol.split(content)
    return lines.join(lineEnd)
  }
  
  static addCompleted ({ task, content, config }) {
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
  
  static parseDueDate (config, text) {
    return File.parseDate(config, text, 'due')
  }
  
  static parseRemindDate (config, text) {
    return File.parseDate(config, text, 'remind')
  }
  
  static parseDeferDate (config, text) {
    return File.parseDate(config, text, 'defer')
  }
  
  static parseDate (config, text, dateType) {
    // TODO Add the ability to set multiple reminders
    // #imdone-1.54.0
    // <!--
    // order:-150
    // -->
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
        logger.log(`Unable to parse ${dateType} date for ${text}`)
        return match
      }
    })
  }

  removeCompleted ({ task, content, config }) {
    const doneList = getDoneList(config)
    if (doneList === task.list) return content
    if (
      task.meta.completed &&
      task.meta.completed.length > 0
    ) {
      content = this.removeMetaData(
        content,
        'completed',
        task.meta.completed[0]
      )
    }
    return content
  }

  trackListChanges ({ task, content, config, modify }) {
    const lists = config.lists
      .filter((list) => !list.filter)
      .map((list) => list.name)

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
    }

    return { content, beforeTextModified }
  }

  removeMetaData (content, key, value) {
    return Task.removeMetaData({
      config: this.projectContext.config,
      content,
      key,
      value,
    })
  }

  transformTask ({config, modify, task}) {
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
    content = File.addStarted({ task, content, config })
    content = File.addCompleted({ task, content, config })
    content = this.removeCompleted({ task, content, config })
    content = task.format(content)
    if (
      content.trim() !== task.content.trim() 
      || trackListChanges.beforeTextModified
      || task.orderModified
    ) {
      this.modifyTaskFromContent(task, content, config)
    }
  }

  transformTasks (config, modify) {
    sort(this.getTasks())
      .desc(u => u.line)
      .forEach(task => this.transformTask({config, modify, task}))
  }

  // TODO Blank lines should be allowed in code tasks
  // <!--
  // #imdone-1.54.0
  // #feature
  // order:-105
  // -->
  extractCodeStyleTasks (config, pos, content) {
    var self = this
    var codeStyleRegex = new RegExp(CODE_STYLE_PATTERN, 'gm')
    var result
    const inBlockComment = this.isInBlockComment(content)
    const singleLineBlockComment =
      inBlockComment && this.isSingleLineBlockComment(content)
    while ((result = codeStyleRegex.exec(content)) !== null) {
      var posInContent = pos + result.index
      var line = this.getLineNumber(posInContent)
      if (self.getTaskAtLine(line)) continue
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

  extractHashStyleTasks (config, pos, content) {
    var hashStyleRegex = getHashStyleRegex(config.tokenPrefix)
    var lang = this.getLang()
    const codePositions = this.getMarkdownCodePositions(content);
    var result
    while ((result = hashStyleRegex.exec(content)) !== null) {
      if (this.isResultInMarkdownCode(codePositions, result.index)) continue;
      var [rawTask, list, orderGroup, order, text] = result
      if (!config.listExists(list)) continue

      const posInContent = result.index + pos
      if (this.isWithinCodeSpanOrBlock(result.index, content)) continue
      
      const line = this.getLineNumber(posInContent)
      if (this.getTaskAtLine(line)) continue

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

  extractLinkStyleTasks (config, pos, content) {
    var self = this
    var linkStyleRegex = new XRegExp(LINK_STYLE_REGEX)
    const log = debug('extractLinkStyleTasks')
    const codePositions = this.getMarkdownCodePositions(content);
    var result
    while ((result = linkStyleRegex.exec(content)) !== null) {
      if (this.isResultInMarkdownCode(codePositions, result.index)) continue;
      let [match, before, rawTask, text, list, colon, order] = result
      const beforeLength = before ? before.length : 0
      const posInContent = result.index + pos + beforeLength
      if (this.isWithinCodeSpanOrBlock(result.index, content)) continue
      var line = this.getLineNumber(posInContent)
      if (self.getTaskAtLine(line)) continue
      if (!config.listExists(list)) continue
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

  extractCheckboxTasks (config, pos, content) {
    if (!this.isMarkDownFile()) return
    if (!config.isAddCheckBoxTasks()) return

    const codePositions = this.getMarkdownCodePositions(content);
    const type = Task.Types[config.getNewCardSyntax()]
    const checkStyleRegex = new RegExp(CHECK_STYLE_PATTERN)
    let result
    let tasks = []
    const hasTaskAtLine = (line) => {
      return (
        this.getTaskAtLine(line) ||
        tasks.find((task) => {
          return line >= task.line && line <= task.lastLine
        })
      )
    }
    while ((result = checkStyleRegex.exec(content)) !== null) {
      if (this.isResultInMarkdownCode(codePositions, result.index)) continue;
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
      task.rawTask = getRawTask({tokenPrefix: config.tokenPrefix, orderMeta: config.orderMeta, list, text, type})
      tasks.push(task)
    }
    if (tasks) {
      const hasTaskAtLine = (line) => {
        return (
          this.getTaskAtLine(line) ||
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
      logger.log('extractCheckboxTasks setModified true for file:', this.path)
    }
  }
  extractTasks (config) {
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

  extractAndTransformTasks (config) {
    this.extractTasks(config)
    this.transformTasks(config)
  }

  // TODO Extract functions should be moved to another file
  // Only pass the needed config values to the functions
  // #imdone-1.54.0
  // <!--
  // order:40
  // -->
  extractTasksInCodeFile (config) {
    var self = this
    var commentRegex = this.getCodeCommentRegex()
    var result
    while ((result = commentRegex.exec(self.getContent())) !== null) {
      var comment = result[0]
      var commentStart = result.index
      self.extractCodeStyleTasks(config, commentStart, comment)
    }
  }

  extractTasksInNonCodeFile (config) {
    this.extractHashStyleTasks(config, 0, this.getContent())
    this.extractLinkStyleTasks(config, 0, this.getContent())
    this.extractCheckboxTasks(config, 0, this.getContent())
  }

  deleteBlankLine (lineNo) {
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

  deleteTaskContent (beforeContent, afterContent) {
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

  deleteDescription (task, config) {
    if (task.singleLineBlockComment) return
    task.description = []
    this.modifyDescription(task, config)
  }

  // TODO This isn't deleting all the newlines at the end of each line in code files
  // <!--
  // #bug
  // #imdone-1.54.0
  // order:-165
  // -->
  deleteCodeOrHashTask (re, task, config) {
    var log = debug('delete-task:deleteCodeOrHashTask')
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

  deleteTask (task, config) {
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
        this.deleteCodeOrHashTask(getHashStyleRegex(config.tokenPrefix), task, config)
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

  modifyTask (task, config, noEmit) {
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
        tokenPrefix: config.tokenPrefix,
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

  modifyCodeOrHashTask (re, task, config, noEmit) {
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
        const tokenPrefix = task.type === Task.Types.HASHTAG ? config.tokenPrefix : ''
        var taskContent = getRawTask({tokenPrefix, orderMeta: config.orderMeta, list: task.list, order: task.order, text, type: task.type})
        task.line = this.getLineNumber(index)
        task.id = getTaskId(self.getPath(), task.line, task.text)
        this.setContent(beforeContent + taskContent + afterContent)
        if (!task.singleLineBlockComment) {
          this.modifyDescription(task, config)
        }
        this.setModified(true)
        // logger.log('modifyCodeOrHashTask setModified true for file:', this.path)
        if (!noEmit) {
          this.emit('task.modified', task)
          this.emit('file.modified', self)
        }
        return this
      }
    }

    return this
  }

  modifyTaskFromHtml (task, html) {
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
    logger.log('modifyTaskFromHtml setModified true for file:', this.path)
  }

  modifyTaskFromContent (task, content, config) {
    content = trimBlankLines(content, this.isCodeFile())
    task.updateFromContent(content)
    this.modifyTask(task, config)
  }

  modifyDescription (task, config) {
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
    // BACKLOG Allow this to pad for code files as well
    // <!--
    // order:-620
    // -->
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

  extractTaskWithDescription ({
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
    // BACKLOG ## add beforeText for code files
    // <!--
    // order:-630
    // -->
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
        : structuredClone(taskContentLines)
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

    task.init()
    if (!config.keepEmptyPriority) task.updateOrderMeta(config, task.format(task.descriptionString))
    task.orderModified = task.order + "" !== order + "" && !bothAreUndefNull(task.order, order)

    return task
  }

  tasksMatch (config, task, line, taskText) {
    return (
      task.id == getTaskId(this.getPath(), line, taskText) ||
      (task.meta.id &&
        Task.getMetaData(config, taskText).id &&
        task.meta.id[0] === Task.getMetaData(config, taskText).id[0])
    )
  }

  getTaskAtLine (line) {
    return this.getTasks().find((task) => {
      return line >= task.line && line <= task.lastLine
    })
  }

  getLinePos (lineNo) {
    return Task.getLinePos(this.content, lineNo)
  }

  getLineNumber (pos, content = this.content) {
    return Task.getLineNumber(content, pos)
  }

  toJSON () {
    return _omit(this, ['domain', '_events', '_maxListeners'])
  }

  getRepoId () {
    return this.repoId
  }

  getPath () {
    return this.path
  }

  getFullPath () {
    return path.join(this.repoId, this.path)
  }

  getId () {
    return this.getPath()
  }

  reset () {
    this.previousContent = this.content
    this.content = null
    this.modified = false
    return this
  }

  rollback () {
    this.content = this.previousContent
    return this
  }

  setContent (content) {
    this.content = content
    return this
  }

  setContentFromFile (content) {
    this.content = eol.auto(content || '')
    return this
  }

  getContent () {
    return this.content
  }

  getContentForFile () {
    return eol.auto(this.content || '')
  }

  getContentLines () {
    return eol.split(this.getContentForFile())
  }

  setModifiedTime (modifiedTime) {
    this.modifiedTime = modifiedTime
    return this
  }

  setCreatedTime (createdTime) {
    this.createdTime = createdTime
    return this
  }

  getCreatedTime () {
    return this.createdTime
  }

  getModifiedTime () {
    return this.modifiedTime
  }

  setModified (modified) {
    this.modified = modified
    return this
  }

  isModified () {
    return this.modified
  }

  getType () {
    return this.constructor.name
  }

  getTasks () {
    return this.tasks
  }

  getTask (id) {
    return (
      this.getTasks().find((task) => id === task.id) ||
      this.getTasks().find(
        (task) => task.meta && task.meta.id && task.meta.id[0] === id.toString()
      )
    )
  }

  addTask (task) {
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

  removeTask (task) {
    if (!(task instanceof Task)) throw new Error(ERRORS.NOT_A_TASK)
    if (!Array.isArray(this.tasks)) this.tasks = []
    var index = this.tasks.findIndex(({ id }) => task.id === id)
    if (index > -1) {
      this.tasks.splice(index, 1)
    }
  }

  isMarkDownFile () {
    return /^md|markdown$/i.test(this.getExt())
  }

  getLang () {
    var lang = this.languages[path.extname(this.path)]
    return lang || { name: 'text', symbol: '' }
  }

  getExt () {
    return path.extname(this.path).substring(1).toLowerCase()
  }

  isCodeFile () {
    var symbol = this.getLang().symbol
    return symbol && symbol !== ''
  }

  getBeforeText (line, pos) {
    return this.isCodeFile()
      ? null
      : this.content.substring(this.getLinePos(line), pos)
  }

  getDescriptionChars (inBlockComment) {
    if (!this.isCodeFile()) return ''
    const lang = this.getLang()
    if (inBlockComment && lang.block && lang.block.ignore) return lang.block.ignore
    return lang.symbol
  }

  getTaskContent ({
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

  isCheckBoxTask (config, line, beforeText) {
    if (!config.isAddCheckBoxTasks()) return

    const beforeTextCheckData = Task.getCheckedData(beforeText)
    if (!beforeTextCheckData) return

    const lineCheckData = Task.getCheckedData(line)
    if (!lineCheckData) return

    return lineCheckData.pad <= beforeTextCheckData.pad
  }

  getCodeCommentRegex () {
    // #BACKLOG:-460 Allow languages to have multiple block comment styles, like html gh:13 id:5
    var lang = this.getLang()
    var symbol = lang.symbol
    var reString = '(?<!["\'`])' + escapeRegExp(symbol) + '[^{].*$'

    if (lang.block) {
      var start = escapeRegExp(lang.block.start)
      var end = escapeRegExp(lang.block.end)
      //
      reString = reString + '|(?<!["\'`])' + start + '(.|[\\r\\n])*?' + end
    }

    return new RegExp(reString, 'gmi')
  }

  trimCommentStart (text) {
    if (this.isCodeFile() && this.getLang().symbol) {
      var start = escapeRegExp(this.getLang().symbol)
      var startPattern = `^\\s*${start}\\s?`
      return text.replace(new RegExp(startPattern), '')
    }
    return text
  }

  trimCommentBlockEnd (text) {
    if (this.isCodeFile() && this.getLang().block) {
      var blockEnd = escapeRegExp(this.getLang().block.end)
      var endPattern = `\\s?${blockEnd}.*$`
      return text.replace(new RegExp(endPattern), '')
    }
    return text
  }

  trimCommentBlockStart (text) {
    if (this.isCodeFile() && this.getLang().block) {
      var blockStart = escapeRegExp(this.getLang().block.start)
      var startPattern = `^\\s*${blockStart}\\s?`
      return text.replace(new RegExp(startPattern), '')
    }
    return text
  }

  trimCommentBlockIgnore (text) {
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

  trimCommentChars (text) {
    let newText = this.trimCommentStart(text)
    if (text === newText) newText = this.trimCommentBlockEnd(text)
    if (text === newText) newText = this.trimCommentBlockStart(text)
    if (text === newText) newText = this.trimCommentBlockIgnore(text)
    return newText
  }

  hasCodeStyleTask (config, text) {
    if (!this.isCodeFile()) return false
    let result = new RegExp(CODE_STYLE_PATTERN).exec(text)
    if (!result) return false
    return config.includeList(result[1])
  }

  hasTaskInText (config, text) {
    return hasTaskInText(config, text, this.isCodeFile())
  }

  isInBlockComment (content) {
    if (!this.isCodeFile()) return false
    const lang = this.getLang()
    return (
      lang.block &&
      lang.block.start &&
      content.trim().startsWith(lang.block.start)
    )
  }

  startsWithCommentOrSpace (pos) {
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

  isSingleLineBlockComment (content) {
    return eol.split(content).length === 1
  }

  parseFrontMatter (config) {
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
      logger.error(`Error processing front-matter in:${this.path}`, err)
    }
    return {}
  }

  getSource () {
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

  isWithinCodeSpanOrBlock(pos, content) {
    const positions = Task.getMarkdownCodePositions(content)
    return Task.isResultInMarkdownCode(positions, pos)
  }

  getMarkdownCodePositions (text) {
    const positions = [];
    const codeBlockRe = /```[\s\S]*?```/g;
    const inlineCodeRe = /`[^`]*`/g;

    let match;

    // Find code blocks
    while ((match = codeBlockRe.exec(text)) !== null) {
      positions.push({ start: match.index, end: match.index + match[0].length });
    }

    // Find inline code spans
    while ((match = inlineCodeRe.exec(text)) !== null) {
      positions.push({ start: match.index, end: match.index + match[0].length });
    }

    return positions;
  };

  isResultInMarkdownCode (positions, index) {
    return positions.some(pos => index >= pos.start && index < pos.end);
  };
}