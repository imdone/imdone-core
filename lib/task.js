'use strict'

var _clone = require('lodash.clone'),
  _isObject = require('lodash.isobject'),
  _isEqual = require('lodash.isequal'),
  _assign = require('lodash.assign'),
  _union = require('lodash.union'),
  _get = require('lodash.get'),
  util = require('util'),
  eol = require('eol'),
  lf = String(eol.lf),
  lineEnd = String(eol.auto),
  fastSort = require('fast-sort/dist/sort.js'),
  { escapeRegExp } = require('./tools'),
  cheerio = require('cheerio')

/**
 * Description
 * @method Task
 * @param {} obj
 * @return
 */
const DATE_META_KEYS = ['due', 'created', 'remind', 'completed']
class Task {
  constructor(config, obj, dontParse) {
    if (!_isObject(obj)) throw new Error('obj must be an Object')
    this.frontMatter = obj.frontMatter || {
      tags: [],
      context: [],
      meta: {},
    }
    this.pos = obj.pos
    this.rawTask = obj.rawTask
    this.beforeText = obj.beforeText
    this.text = obj.text
    this.list = obj.list
    this.order = obj.order
    this.hasColon = obj.hasColon
    this.line = obj.line
    this.id = obj.id
    this.repoId = obj.repoId
    this.source = obj.source
    this.type = obj.type
    this.tags = obj.tags || []
    this.context = obj.context || []
    this.meta = obj.meta || {}
    this.metaIndex = obj.metaIndex || {}
    this.inCodeBlock = obj.inCodeBlock
    this.singleLineBlockComment = obj.singleLineBlockComment
    this.description = obj.description || []
    this.rawDescription = obj.rawDescription || []
    this.taskStartOnLine = obj.taskStartOnLine || 0
    this.commentStartOnLine = obj.commentStartOnLine || 0
    this.descriptionStartsWith = obj.descriptionStartsWith
    this.filteredListName = obj.filteredListName
    this.preserveBlankLines = obj.preserveBlankLines
    this.config = config
    this.allMeta = obj.allMeta || {}
    this.allContext = obj.allContext || []
    this.allTags = obj.allTags || []
    this.progress = obj.progress
    this.content = obj.content
    this.lastLine = this.getLastLine()
    this.orderModified = obj.orderModified
    if (dontParse || !this.text) return
    this.parse()
  }

  set order(val) {
    const order = parseFloat(val)
    this.innerOrder = isNaN(order) ? null : order
  }

  get order() {
    return this.innerOrder
  }
  
  updateLastLine() {
    this.lastLine = this.getLastLine()
  }

  getLastLine() {
    let lastLine = this.line + this.description.length
    if (this.preserveBlankLines) lastLine += 2
    return lastLine
  }

  parse() {
    const checkedData = this.getCheckedData()
    this.paddingLength = checkedData ? checkedData.pad : 0
    this.parseTodoTxt()
    if (this.meta.order) {
      this.order = this.meta.order[0]
    }
    this.allMeta = this.getMetaData()
    this.allContext = this.getContext()
    this.allTags = this.getTags()
    this.metaKeys = Object.keys(this.allMeta)
    this.progress = this.getProgress()
    this.content = this.getContent()
  }

  issueNumberRegExp() {
    return new RegExp(/:\/\/github\.com.*?\/issues\/\d+/)
  }

  get listId() {
    return this.filteredListName || this.list
  }

  get path() {
    return this.source.path
  }

  get markdownBeforeText() {
    if (!this.beforeText) return ''
    const beforeText = this.beforeText
      .replace('<!--', '')
      .trim()
      .replace(/[^#]+/g, '')
    return beforeText.length > 0 ? `${beforeText} ` : ''
  }

  getOrder() {
    return this.order
  }

  getTextAndDescription() {
    const description = _clone(this.description)
    const text = this.getText({
      stripMeta: true,
      sanitize: true,
      stripTags: true,
      stripContext: true,
    })
    const descriptionMD = description.map((line) => {
      return this.getText(
        {
          stripMeta: true,
          sanitize: true,
          stripTags: true,
          stripContext: true,
        },
        line
      )
    })
    return `${this.markdownBeforeText}${text}${lineEnd}${descriptionMD.join(
      lineEnd
    )}`.replace(/<!--\s*\[\s*([\s\S]*?)\s*\]\s*-->/gm, '$1')
  }

  getRawTextAndDescription() {
    const description = _clone(this.description)
    const text = this.text
    if (description.length < 1) return text
    const descriptionMD = description.join(lineEnd)
    return `${text}${lineEnd}${descriptionMD}${lineEnd}`
  }

  getProgress() {
    const progress = { completed: 0, total: 0 }
    const text = this.interpretedContent
    if (!text) return progress
    const checks = text.match(/- \[[x| ]\]/g)
    if (!checks) return progress
    return {
      completed: checks.filter((match) => match.includes('x')).length,
      total: checks.length,
    }
  }

  getContent() {
    return this.getRawTextAndDescription()
  }

  updateContent() {
    this.content = this.text + lineEnd + this.description.join(lineEnd)
  }

  updateFromContent(content) {
    let lines = eol.split(content)
    this.text = lines.shift().trim()
    if (lines && lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop()
    this.description = lines
    this.parse()
  }

  toJSON() {
    return _assign({}, this, {
      allTags: this.allTags,
      allContext: this.allContext,
      allMeta: this.allMeta,
      config: undefined,
      expand: !!_get(this, 'allMeta.expand[0]'),
    })
  }
}

Task.CHECK_REGEX = /^(\s*- )\[([x ])\]/
Task.getCheckedData = function (content) {
  const taskRegex = new RegExp(Task.CHECK_REGEX)
  const result = taskRegex.exec(content)
  return result
    ? {
        pad: result[1].length,
        checked: result[2].trim() !== '',
      }
    : null
}

Task.hasCheckPrefix = function (content) {
  return new RegExp(Task.CHECK_REGEX).test(content)
}

Task.padDescription = function (description = [], beforeText = '') {
  const checkedData = Task.getCheckedData(beforeText)
  if (checkedData) {
    return description.map((line) => {
      const paddedLine = line.padStart(line.length + checkedData.pad)
      return paddedLine.trim() ? paddedLine : ''
    })
  }
  return description
}

Task.trimDescription = function (rawDescription, beforeText) {
  const checkedData = Task.getCheckedData(beforeText)
  if (checkedData) {
    rawDescription = rawDescription.map((line) => {
      const lineLength = line.length
      line = line.trimStart()
      return line.padStart(lineLength - checkedData.pad)
    })
  }
  return rawDescription
}

Task.prototype.getCheckedData = function () {
  return Task.getCheckedData(this.beforeText)
}

Task.Types = {
  CODE: 'CODE',
  HASHTAG: 'HASHTAG',
  MARKDOWN: 'MARKDOWN',
}

Task.AnyLanguageGroup =
  '\\w:%/.$-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6E5\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC'
Task.EmojiGroup = '\\p{Emoji_Presentation}'

Task.TagsRegExp = new RegExp(
  `(^|\\s)[+#]([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
  'gmiu'
)
Task.getTagRegexp = function (prefix = '+') {
  return new RegExp(
    `(^|\\s)[${prefix}]([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
    'gmiu'
  )
}
Task.getTags = function (text, prefix = '+') {
  const tags = []
  var codePositions = Task.getMarkdownCodePositions(text)
  var result,
    re = Task.getTagRegexp(prefix)

  while ((result = re.exec(text)) !== null) {
    if (Task.isResultInMarkdownCode(codePositions, result.index)) continue
    const tag = result[2]
    if (!tags.includes(tag)) tags.push(tag)
  }

  return tags
}

Task.ContextRegExp = new RegExp(
  `(^|\\s)@([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
  'gmiu'
)
// Task.ContextRegExp = /(^|\s)\@([\w:%/.$-]+)/gmi
Task.getContext = function (text) {
  const context = []
  var codePositions = Task.getMarkdownCodePositions(text)
  var result,
    re = new RegExp(Task.ContextRegExp)

  while ((result = re.exec(text)) !== null) {
    if (Task.isResultInMarkdownCode(codePositions, result.index)) continue
    const con = result[2]
    if (!context.includes(con)) context.push(con)
  }

  return context
}

Task.MetaRegExp = new RegExp(
  `(^|\\s)([a-zA-Z-_]+?):(?!\\/\\/)([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
  'gu'
)
Task.getMetaRegExp = function (config) {
  return new RegExp(
    `(^|\\s)([a-zA-Z-_]+?)${config.getMetaSep()}(?!\\/\\/)([${
      Task.AnyLanguageGroup
    }${Task.EmojiGroup}]+)`,
    'gu'
  )
}
Task.MetaRegExpQuotes = new RegExp(
  `(^|\\s)([a-zA-Z-_]+?):"((?:""|[^"]|[${Task.AnyLanguageGroup}${Task.EmojiGroup}])*)"`,
  'gu'
)
Task.getMetaRegExpQuotes = function (config) {
  return new RegExp(
    `(^|\\s)([a-zA-Z-_]+?)${config.getMetaSep()}"((?${config.getMetaSep()}""|[^"]|[${
      Task.AnyLanguageGroup
    }${Task.EmojiGroup}])*)"`,
    'gu'
  )
}

Task.parseMetaData = function (config, content) {
  var meta = {}
  Task.eachMetaInContent(config, content, (result) => {
    var key = result[2]
    var val = result[3]
    if (!meta[key]) meta[key] = []
    if (!meta[key].push) return
    meta[key].push(val)
  })
  return meta
}

Task.getMetaData = function (config, task) {
  var text = Task.isTask(task) ? task.getRawTextAndDescription() : task
  var meta = Task.parseMetaData(config, text)
  Object.entries(meta).forEach(([key, val]) => {
    if (DATE_META_KEYS.includes(key)) {
      try {
        const date = new Date(val)
        task[key] = date.toISOString()
        task[`${key}Date`] = date.toISOString()
      } catch (e) {}
    }
  })
  return meta
}

Task.execMetaRegex = function (re, content, codePositions, cb) {
  let result
  while ((result = re.exec(content)) !== null) {
    const index = result.index
    if (Task.isResultInMarkdownCode(codePositions, index)) continue
    var key = result[2]
    if (/[\(<]{1}(http|ssh|ftp|git)/.test(key)) continue
    if (!/^[^$][^\s\.]+$/.test(key)) continue
    cb(result)
  }
}

Task.eachMetaInContent = function (config, content, cb) {
  var codePositions = Task.getMarkdownCodePositions(content)
  Task.execMetaRegex(Task.getMetaRegExp(config), content, codePositions, cb)
  Task.execMetaRegex(
    Task.getMetaRegExpQuotes(config),
    content,
    codePositions,
    cb
  )
}

Task.hasWindowsEOL = function (content) {
  return /\r\n|\r/.test(content)
}

Task.getLinePos = function (content, lineNo) {
  var re = /^/gm
  var line = 1
  var result
  const normalizedContent = eol.lf(content)
  while ((result = re.exec(normalizedContent)) !== null) {
    if (line == lineNo) {
      return Task.hasWindowsEOL(content)
        ? result.index + line - 1
        : result.index
    }
    if (result.index === re.lastIndex) re.lastIndex++
    line++
  }
  return content.length
}

Task.getLineNumber = function (content, pos) {
  const contentBeforePos = content.substring(0, pos)
  const lines = eol.split(contentBeforePos)
  return lines.length
}

Task.prototype.getTagPrefix = function () {
  return this.config.getTagPrefix()
}

Task.prototype.addToLastCommentInContent = Task.addToLastCommentInContent = function (content, toAdd, newLine) {
  // BACKLOG:-220 respect padding of task prefix for list items
  let prefix = newLine ? lineEnd : ' '
  const commentRegex = /<!--([\s\S]*?)-->/gm
  let result, lastIndex, index
  while ((result = commentRegex.exec(content))) {
    lastIndex = commentRegex.lastIndex
    index = result.index
  }

  if (lastIndex > 0) {
    let before = content.slice(0, lastIndex - 3).trimEnd()
    const after = content.slice(lastIndex - 3)
    return `${before}${prefix}${toAdd}${prefix}${after}`
  }
  if (!content.endsWith(lf) && content !== '') content = content + lineEnd
  return `${content}<!--${prefix}${toAdd}${prefix}-->`
}

Task.getMetaOrderRegex = function (config) {
  const metaSep = config.getMetaSep()
  return new RegExp(
    `order${metaSep}("(-?[\\d.]+(?:e-?\\d+)?)"|(-?[\\d.]+(?:e-?\\d+)?))`,
    'gm'
  )
}

Task.prototype.updateOrderMeta = function (config, descContent = this.description.join(lineEnd)) {
  if (config.orderMeta) {
    if (!Task.isNumber(this.order)) return this.order = ''
    const newLine = config.isMetaNewLine()
    const metaSep = config.getMetaSep()
    if (this.meta.order) {
      const regex = Task.getMetaOrderRegex(config)
      descContent = descContent.replace(regex, `order${metaSep}${this.order}`)
    } else {
      descContent = this.addToLastCommentInContent(
        descContent,
        `order${metaSep}${this.order}`,
        newLine
      )
    }
    this.meta.order = [this.order]
  } else {
    descContent = Task.removeMetaData({
      config,
      content: descContent,
      key: 'order',
      value: Task.parseMetaData(config, descContent).order,
    })
  }
  this.description = descContent.split(lineEnd)
  this.updateContent()
}

Task.prototype.replaceContent = function (regex, replacement) {
  this.text = this.text.replace(regex, replacement)
  this.description = this.description.map((line) =>
    line.replace(regex, replacement)
  )
}

Task.prototype.replaceMetaSep = function (oldMetaSep, newMetaSep) {
  Object.keys(this.meta).forEach((key) => {
    const metaValues = this.meta[key]
    metaValues.forEach((metaValue) => {
      let regex = new RegExp(escapeRegExp(`${key}${oldMetaSep}"${metaValue}"`))
      this.replaceContent(regex, `${key}${newMetaSep}"${metaValue}"`)
      if (metaValue && !metaValue.toString().includes(' ')) {
        regex = new RegExp(escapeRegExp(`${key}${oldMetaSep}${metaValue}`))
        this.replaceContent(regex, `${key}${newMetaSep}${metaValue}`)
      }
    })
  })
}

/**
 * Description
 * @method isTask
 * @param {} task
 * @return BinaryExpression
 */
Task.isTask = function (task) {
  return task instanceof Task
}

Task.getMarkdownCodePositions = function (text) {
  const re = /`([^`]+)`/g
  let result
  let positions = []
  while ((result = re.exec(text)) !== null) {
    const start = result.index
    const end = start + result[0].length
    positions.push({ start, end })
  }
  return positions
}

Task.isResultInMarkdownCode = function (positions, index) {
  for (let i = 0; i < positions.length; i++) {
    const { start, end } = positions[i]
    if (index > start && index < end) return true
  }
  return false
}

Task.prototype.parseTodoTxt = function () {
  this.tags = Task.getTags(this.getRawTextAndDescription(), this.getTagPrefix())
  this.context = Task.getContext(this.getRawTextAndDescription())
  this.meta = Task.getMetaData(this.config, this)
}

Task.removeTags = function (text, prefix = '+') {
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(Task.getTagRegexp(prefix), (match, p1, p2, offset) => {
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ''
  })
}

Task.removeContext = function (text) {
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(
    new RegExp(Task.ContextRegExp),
    (match, p1, p2, offset) => {
      if (Task.isResultInMarkdownCode(positions, offset)) return match
      return ''
    }
  )
}

Task.prototype.updateContext = function () {
  // BACKLOG:-900 implement updateContext id:1 gh:124
  var self = this
  if (this.context) {
    let text = Task.removeContext(this.text)
    this.context.forEach((context) => {
      text += ` @${context}`
    })
    this.text = text
  }
}

Task.removeMetaDataFromText = function (config, text) {
  const re = Task.getMetaRegExp(config)
  const re2 = Task.getMetaRegExpQuotes(config)

  const positions = Task.getMarkdownCodePositions(text)
  return text
    .replace(re, (match, p1, p2, p3, offset) => {
      if (/[\(<]{1}(http|ssh|ftp|git)/.test(p1)) return match
      if (Task.isResultInMarkdownCode(positions, offset)) return match
      return ''
    })
    .replace(re2, (match, p1, p2, p3, offset) => {
      if (/[\(<]{1}(http|ssh|ftp|git)/.test(p1)) return match
      if (Task.isResultInMarkdownCode(positions, offset)) return match
      return ''
    })
}

Task.removeMetaData = function ({ config, content, key, value }) {
  return content.replace(
    new RegExp(`${key}${config.getMetaSep()}"?${value}"?\\s`, 'g'),
    ''
  )
}

Task.prototype.getTags = function () {
  if (!this.tags) this.tags = []
  return _union(this.tags, this.frontMatter.tags)
}

Task.prototype.getContext = function () {
  if (!this.context) this.context = []
  return _union(this.context, this.frontMatter.context)
}

Task.prototype.getDueMeta = function () {
  const dueMeta = this.allMeta.due
  if (dueMeta) return dueMeta[0]
}

Task.prototype.getMetaData = function () {
  const meta = _clone(this.frontMatter.meta) || []
  Object.entries(meta).forEach(([key, val]) => {
    if (this.meta[key]) meta[key] = _union(meta[key], this.meta[key])
  })
  Object.entries(this.meta).forEach(([key, val]) => {
    if (!meta[key]) meta[key] = this.meta[key]
  })
  return meta
}

Task.prototype.getListTrackingMeta = function (lists) {
  const taskMeta = this.meta
  let listTrackingMeta = []
  lists.forEach((list) => {
    if (taskMeta[list]) {
      const listMeta = taskMeta[list].map((timestamp) => ({ list, timestamp }))
      listTrackingMeta = listTrackingMeta.concat(listMeta)
    }
  })
  return fastSort(listTrackingMeta).asc(u => u.timestamp)
}

Task.prototype.hasListChanged = function (lists) {
  const listTrackingMeta = this.getListTrackingMeta(lists)
  return (
    listTrackingMeta.length === 0 || listTrackingMeta.pop().list !== this.list
  )
}

Task.prototype.hasMetaData = function (key, value) {
  var meta = this.meta[key]
  if (!meta) return false
  if (Array.isArray(value)) return _isEqual(value.sort(), meta.sort())
  return meta.includes(value)
}

/**
 * Returns metadata as list with links
 * @method getMetaDataWithLinks
 * @param {} repository config
 * @return Array
 */
Task.prototype.getMetaDataWithLinks = function (config) {
  var self = this
  var meta = []
  var metaData = this.allMeta
  if (metaData) {
    Object.getOwnPropertyNames(metaData)
      .sort()
      .forEach(function (metaKey) {
        var valList = metaData[metaKey]
        valList.forEach(function (value) {
          meta.push({
            key: metaKey,
            value: value,
            link: self.getMetaLink(config, metaKey, value),
          })
        })
      })
  }

  return meta
}

Task.prototype.getMetaLink = function (config, metaKey, metaValue) {
  var metaConfig = config.meta && config.meta[metaKey]
  if (!metaConfig || !metaValue) return
  return {
    title: util.format(metaConfig.titleTemplate, metaValue),
    url: util.format(metaConfig.urlTemplate, metaValue),
    icon: metaConfig.icon,
  }
}

Task.prototype.toString = function () {
  return util.format(
    'file:%s, line:%d, text:%s, id:%s',
    this.source.path,
    this.line,
    this.text,
    this.id
  )
}

/**
 * Description
 * @method getRepoId
 * @return MemberExpression
 */
Task.prototype.getRepoId = function () {
  return this.repoId
}

/**
 * Description
 * @method getSource
 * @return MemberExpression
 */
Task.prototype.getSource = function () {
  return this.source
}

/**
 * Description
 * @method getId
 * @return MemberExpression
 */
Task.prototype.getId = function () {
  return this.id
}

/**
 * Description
 * @method getList
 * @return MemberExpression
 */
Task.prototype.getList = function () {
  return this.list
}

/**
 * Description
 * @method getText
 * @return text
 */
// BACKLOG:-160 make this use config.getMetaSep
Task.prototype.getText = function (opts, text) {
  if (text === undefined) text = this.text
  if (opts) {
    if (opts.stripMeta) {
      text = Task.removeMetaDataFromText(this.config || {}, text)
    }
    if (opts.stripTags) {
      text = Task.removeTags(text, this.getTagPrefix())
    } else if (this.fontMatter && this.frontMatter.tags) {
      this.frontMatter.tags.forEach((tag) => (text += ` +${tag}`))
    }
    if (opts.stripContext) {
      text = Task.removeContext(text)
    } else if (this.fontMatter && this.frontMatter.context) {
      this.frontMatter.context.forEach((context) => (text += ` @${context}`))
    }
  }
  return text
}

Task.prototype.getDescription = function (opts) {
  return this.description
    .map((line) => {
      return this.getText(opts, line)
    })
    .join(lineEnd)
}

Task.prototype.getChecksFromHtml = function (html) {
  let $ = cheerio.load(html)
  let checks = $('.task-description').find("input[type='checkbox']")
  const result = []
  checks.each(function () {
    result.push($(this).is(':checked'))
  })
  return result
}

/**
 * Description
 * @method order
 * @return MemberExpression
 */
Task.prototype.order = function () {
  return this.order
}

/**
 * Description
 * @method getLine
 * @return MemberExpression
 */
Task.prototype.getLine = function () {
  return this.line
}

Task.prototype.getType = function () {
  return this.type
}

/**
 * Description
 * @method equals
 * @param {} task
 * @return LogicalExpression
 */
Task.prototype.equals = function (task) {
  if (!task) return
  return (
    task.getRepoId() == this.getRepoId() &&
    task.getSource().path == this.getSource().path &&
    task.getId() == this.getId()
  )
}

Task.isNumber = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

module.exports = Task
