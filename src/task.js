import util from 'util';
import eol from 'eol';
import { sort } from 'fast-sort';
import { extractWikilinkTopics } from './adapters/markdown.js';
import { 
  CHECK_REGEX,
  TASK_TYPES,
  getCheckedData,
  isBeforeTextMarkdownList,
  isNumber
} from './adapters/parsers/task/CardContentParser.js';
import tools from './tools.js';

const { deepEqual, union, escapeRegExp } = tools
const lf = String(eol.lf);
const lineEnd = String(eol.auto);

/**
 * Description
 * @method Task
 * @param {} obj
 * @return
 */
export default class Task {
  constructor(config, obj, dontParse) {
    if (obj == null || typeof obj !== 'object') throw new Error('obj must be an Object')
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
    this.inBlockComment = obj.inBlockComment
    this.singleLineBlockComment = obj.singleLineBlockComment
    this.description = obj.description || []
    this.rawTaskContentLines = obj.rawTaskContentLines || []
    this.taskStartOnLine = obj.taskStartOnLine || 0
    this.commentStartOnLine = obj.commentStartOnLine || 0
    this.descriptionStartsWith = obj.descriptionStartsWith
    this.filteredListName = obj.filteredListName
    this.isWrappedWithCardTag = obj.isWrappedWithCardTag
    this.config = config
    this.allMeta = obj.allMeta || {}
    this.allContext = obj.allContext || []
    this.allTags = obj.allTags || []
    this.progress = obj.progress
    this.content = obj.content
    this.lastLine = this.getLastLine()
    this.orderModified = obj.orderModified
    this.index = obj.index
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

  get descriptionString() {
    return this.description.join(lineEnd)
  }
  
  updateLastLine() {
    this.lastLine = this.getLastLine()
  }

  getLastLine() {
    let lastLine = this.line + this.rawTaskContentLines.length
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
    this.topics = extractWikilinkTopics(this.content)
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
    const taskContent = `${this.markdownBeforeText}${this.text}${lineEnd}${this.descriptionString}`
    .replace(/<!--\s*\[\s*([\s\S]*?)\s*\]\s*-->/gm, '$1')
    return this.getText(
      {
        stripMeta: true,
        sanitize: true,
        stripTags: true,
        stripContext: true,
      },
      taskContent);
  }

  getRawTextAndDescription() {
    const text = this.text
    if (this.description.length < 1) return text
    return `${text}${lineEnd}${this.descriptionString}${lineEnd}`
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
    this.content = this.text + lineEnd + this.descriptionString
  }

  updateFromContent(content) {
    // replace all occurrences of two empty lines in a row with a single empty line
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n')
    let lines = eol.split(content)
    this.text = lines.shift().trimStart()
    if (lines && lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop()
    this.description = lines
    this.parse()
  }

  toJSON() {
    return Object.assign({}, this, {
      allTags: this.allTags,
      allContext: this.allContext,
      allMeta: this.allMeta,
      config: undefined,
      expand: !!this?.allMeta?.expand[0]
    })
  }

  getTagPrefix () {
    return this.config?.getTagPrefix()
  }
  
  static addToLastCommentInContent (content, toAdd, newLine) {
    // BACKLOG respect padding of task prefix for list items
    // <!--
    // order:-680
    // -->
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
    if (isBeforeTextMarkdownList(this.beforeText)) {
      const spaces = this.beforeText.search(/\S|$/)
      content = content.padEnd(content.length + spaces)
      prefix = prefix.padEnd(prefix.length + spaces)
    }
  
    return `${content}<!--${prefix}${toAdd}${prefix}-->`
  }

  addToLastCommentInContent (content, toAdd, newLine) {
    return Task.addToLastCommentInContent(content, toAdd, newLine)
  }

  getCheckedData () {
    return getCheckedData(this.beforeText)
  }
  
  updateOrderMeta (config, descContent = this.descriptionString) {
    if (config.orderMeta) {
      if (!isNumber(this.order)) return this.order = ''
      const addNewLine = config.isMetaNewLine()
      const metaSep = config.getMetaSep()
      if (this.meta.order) {
        const regex = Task.getMetaOrderRegex(config)
        descContent = descContent.replace(regex, `order${metaSep}${this.order}`)
      } else {
        descContent = this.addToLastCommentInContent(
          descContent,
          `order${metaSep}${this.order}`,
          addNewLine
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
  
  replaceContent (regex, replacement) {
    this.text = this.text.replace(regex, replacement)
    this.description = this.description.map((line) =>
      line.replace(regex, replacement)
    )
  }
  
  replaceMetaSep (oldMetaSep, newMetaSep) {
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

  static DATE_META_KEYS = ['due', 'defer', 'created', 'started', 'remind', 'completed', 'archivedAt']

  static hasCheckPrefix (content) {
    return new RegExp(CHECK_REGEX).test(content)
  }

  static padDescription (description = [], beforeText = '') {
    const checkedData = getCheckedData(beforeText)
    if (checkedData) {
      return description.map((line) => {
        const paddedLine = line.padStart(line.length + checkedData.pad)
        return paddedLine.trim() ? paddedLine : ''
      })
    }
    return description
  }

  static trimDescription (rawTaskContentLines, beforeText) {
    const checkedData = getCheckedData(beforeText)
    if (checkedData) {
      rawTaskContentLines = rawTaskContentLines.map((line) => {
        const lineLength = line.length
        line = line.trimStart()
        return line.padStart(lineLength - checkedData.pad)
      })
    }
    return rawTaskContentLines
  }

  static Types = TASK_TYPES

  static AnyLanguageGroup =
    '#\\w:%/.$-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6E5\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC'
  static EmojiGroup = '\\p{Emoji_Presentation}'

  static getTagRegexp (prefix = '+') {
    return new RegExp(
      `(^|\\s)[${prefix}](?![${Task.AnyLanguageGroup}${Task.EmojiGroup}]*##)([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
      'gmiu'
    )
  }
  static getTags (text, prefix = '+') {
    const tags = [];
    const codePositions = Task.getMarkdownCodePositions(text);
    const linkLabelPositions = Task.getMarkdownLinkLabelPositions(text);
    let result;
    const re = Task.getTagRegexp(prefix);

    while ((result = re.exec(text)) !== null) {
      if (Task.isResultInMarkdownCode(codePositions, result.index)) continue;
      if (Task.isResultInMarkdownLinkLabel(linkLabelPositions, result.index)) continue;
      const tag = result[2];
      if (tags.includes(tag) || /^[#]+$/.test(tag)) continue;
      tags.push(tag);
    }

    return tags;
  };

  static getMarkdownLinkLabelPositions (text) {
    const positions = [];
    const re = /\[([^\]]+)\]\([^\)]+\)/g;
    let match;

    while ((match = re.exec(text)) !== null) {
      positions.push({ start: match.index, end: re.lastIndex });
    }

    return positions;
  };

  static isResultInMarkdownLinkLabel (linkLabelPositions, index) {
    return linkLabelPositions.some(pos => index >= pos.start && index < pos.end);
  };

  static ContextRegExp = new RegExp(
    `(^|\\s)@([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
    'gmiu'
  )

  static getContext (text) {
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

  static MetaRegExp = new RegExp(
    `(^|\\s)([a-zA-Z-_]+?):(?!\\/\\/)([${Task.AnyLanguageGroup}${Task.EmojiGroup}]+)`,
    'gu'
  )
  static getMetaRegExp (config) {
    return new RegExp(
      `(^|\\s)([a-zA-Z-_]+?)${config.getMetaSep()}(?![*_]+)(?!\\/\\/)([${
        Task.AnyLanguageGroup
      }${Task.EmojiGroup}]+)`,
      'gu'
    )
  }
  static getMetaRegExpQuotes (config) {
    return new RegExp(
      `(^|\\s)([a-zA-Z-_]+?)${config.getMetaSep()}(?![*_]+)"((?${config.getMetaSep()}""|[^"]|[${
        Task.AnyLanguageGroup
      }${Task.EmojiGroup}])*)"`,
      'gu'
    )
  }

  static parseMetaData (config, content) {
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

  static getMetaData (config, task) {
    var text = Task.isTask(task) ? task.getRawTextAndDescription() : task
    var meta = Task.parseMetaData(config, text)
    Object.entries(meta).forEach(([key, val]) => {
      if (Task.DATE_META_KEYS.includes(key)) {
        try {
          const date = new Date(val)
          task[key] = date.toISOString()
          task[`${key}Date`] = date.toISOString()
        } catch (e) {}
      }
    })
    return meta
  }

  static execMetaRegex (re, content, codePositions, cb) {
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

  static eachMetaInContent (config, content, cb) {
    var codePositions = Task.getMarkdownCodePositions(content)
    Task.execMetaRegex(Task.getMetaRegExp(config), content, codePositions, cb)
    Task.execMetaRegex(
      Task.getMetaRegExpQuotes(config),
      content,
      codePositions,
      cb
    )
  }

  static hasWindowsEOL (content) {
    return /\r\n|\r/.test(content)
  }

  static getLinePos (content, lineNo) {
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

  static getLineNumber (content, pos) {
    const contentBeforePos = content.substring(0, pos)
    const lines = eol.split(contentBeforePos)
    return lines.length
  }

  static getMetaOrderRegex (config) {
    const metaSep = config.getMetaSep()
    return new RegExp(
      `order${metaSep}("(-?[\\d.]+(?:e-?\\d+)?)"|(-?[\\d.]+(?:e-?\\d+)?))`,
      'gm'
    )
  }

  /**
   * Description
   * @method isTask
   * @param {} task
   * @return BinaryExpression
   */
  static isTask (task) {
    return task instanceof Task
  }

  static getMarkdownCodePositions (text) {
    const re = /(```[\s\S]*?```|`[^`]+`)/g;
    let result;
    let positions = [];
    while ((result = re.exec(text)) !== null) {
      const start = result.index;
      const end = start + result[0].length;
      positions.push({ start, end });
    }
    return positions;
  };  

  static isResultInMarkdownCode (positions, index) {
    for (let i = 0; i < positions.length; i++) {
      const { start, end } = positions[i]
      if (index > start && index < end) return true
    }
    return false
  }

  static removeTags (text, prefix = '+') {
    const codePositions = Task.getMarkdownCodePositions(text);
    const linkLabelPositions = Task.getMarkdownLinkLabelPositions(text);
    return text.replace(Task.getTagRegexp(prefix), (match, p1, p2, offset) => {
      if (Task.isResultInMarkdownCode(codePositions, offset) || Task.isResultInMarkdownLinkLabel(linkLabelPositions, offset) || match.includes('##')) {
        return match;
      }
      return '';
    });
  };

  static removeContext (text) {
    const positions = Task.getMarkdownCodePositions(text)
    return text.replace(
      new RegExp(Task.ContextRegExp),
      (match, p1, p2, offset) => {
        if (Task.isResultInMarkdownCode(positions, offset)) return match
        return ''
      }
    )
  }

  static removeMetaDataFromText (config, text) {
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

  static removeMetaData ({ config, content, key, value }) {
    return content.replace(
      new RegExp(`${key}${config.getMetaSep()}"?${value}"?\\s`, 'g'),
      ''
    )
  }
  updateContext () {
    // BACKLOG implement updateContext id:1 gh:124
    // <!--
    // order:-690
    // -->
    var self = this
    if (this.context) {
      let text = Task.removeContext(this.text)
      this.context.forEach((context) => {
        text += ` @${context}`
      })
      this.text = text
    }
  }

  parseTodoTxt () {
    this.tags = Task.getTags(this.getRawTextAndDescription(), this.getTagPrefix())
    this.context = Task.getContext(this.getRawTextAndDescription())
    this.meta = Task.getMetaData(this.config, this)
  }

  getTags () {
    if (!this.tags) this.tags = []
    return union(this.tags, this.frontMatter.tags)
  }

  getContext () {
    if (!this.context) this.context = []
    return union(this.context, this.frontMatter.context)
  }

  getDueMeta () {
    const dueMeta = this.allMeta.due
    if (dueMeta) return dueMeta[0]
  }

  getMetaData () {
    const meta = structuredClone(this.frontMatter.meta) || []
    Object.entries(meta).forEach(([key, val]) => {
      if (this.meta[key]) meta[key] = union(meta[key], this.meta[key])
    })
    Object.entries(this.meta).forEach(([key, val]) => {
      if (!meta[key]) meta[key] = this.meta[key]
    })
    return meta
  }

  getListTrackingMeta (lists) {
    const taskMeta = this.meta
    let listTrackingMeta = []
    lists.forEach((list) => {
      if (taskMeta[list]) {
        const listMeta = taskMeta[list].map((timestamp) => ({ list, timestamp }))
        listTrackingMeta = listTrackingMeta.concat(listMeta)
      }
    })
    return sort(listTrackingMeta).asc(u => u.timestamp)
  }

  hasListChanged (lists) {
    const listTrackingMeta = this.getListTrackingMeta(lists)
    return (
      listTrackingMeta.length === 0 || listTrackingMeta.pop().list !== this.list
    )
  }

  hasMetaData (key, value) {
    var meta = this.meta[key]
    if (!meta) return false
    if (Array.isArray(value)) return deepEqual(value.sort(), meta.sort())
    return meta.includes(value)
  }

  /**
   * Returns metadata as list with links
   * @method getMetaDataWithLinks
   * @param {} repository config
   * @return Array
   */
  getMetaDataWithLinks (config) {
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

  getMetaLink (config, metaKey, metaValue) {
    var metaConfig = config.meta && config.meta[metaKey]
    if (!metaConfig || !metaValue) return
    return {
      title: util.format(metaConfig.titleTemplate, metaValue),
      url: util.format(metaConfig.urlTemplate, metaValue),
      icon: metaConfig.icon,
    }
  }

  toString () {
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
  getRepoId () {
    return this.repoId
  }

  /**
   * Description
   * @method getSource
   * @return MemberExpression
   */
  getSource () {
    return this.source
  }

  /**
   * Description
   * @method getId
   * @return MemberExpression
   */
  getId () {
    return this.id
  }

  /**
   * Description
   * @method getList
   * @return MemberExpression
   */
  getList () {
    return this.list
  }

  /**
   * Description
   * @method getText
   * @return text
   */
  // BACKLOG make this use config.getMetaSep
  // <!--
  // order:-700
  // -->
  getText (opts, text) {
    if (text === undefined) return
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

  getChecksFromHtml (html) {
    const result = [];
    const checkboxRegex = /<input[^>]*type=['"]checkbox['"][^>]*>/gi;
    const checkedRegex = /checked(?:=['"]?checked['"]?)?/i;

    let match;
    while ((match = checkboxRegex.exec(html)) !== null) {
      result.push(checkedRegex.test(match[0]));
    }

    return result;
  };

  /**
   * Description
   * @method order
   * @return MemberExpression
   */
  order () {
    return this.order
  }

  /**
   * Description
   * @method getLine
   * @return MemberExpression
   */
  getLine () {
    return this.line
  }

  getType () {
    return this.type
  }

  /**
   * Description
   * @method equals
   * @param {} task
   * @return LogicalExpression
   */
  equals (task) {
    if (!task) return
    return (
      task.getRepoId() == this.getRepoId() &&
      task.getSource().path == this.getSource().path &&
      task.getId() == this.getId()
    )
  }
}