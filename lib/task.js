'use strict';

var _clone = require('lodash.clone'),
    _isObject = require('lodash.isobject'),
    _isEqual  = require('lodash.isequal'),
    _assign   = require('lodash.assign'),
    util   = require('util'),
    eol    = require('eol'),
    lf     = String(eol.lf),
    fastSort = require('fast-sort/dist/sort.js'),
    cheerio = require('cheerio');

/**
 * Description
 * @method Task
 * @param {} obj
 * @return
 */
const DATE_META_KEYS = ['due', 'created', 'remind', 'completed']
class Task {
  constructor(obj, dontParse) {
    if (!(_isObject(obj))) throw new Error("obj must be an Object");
    this.frontMatter = obj.frontMatter || {
      tags: [],
      context: [],
      meta: {}
    }
    this.rawTask = obj.rawTask
    this.beforeText = obj.beforeText
    this.text = obj.text;
    this.list = obj.list;
    this.order = obj.order;
    this.hasColon = obj.hasColon;
    this.line = obj.line;
    this.id = obj.id;
    this.repoId = obj.repoId;
    this.source = obj.source;
    this.type = obj.type;
    this.tags = obj.tags || [];
    this.context = obj.context || [];
    this.meta = obj.meta || {};
    this.metaIndex = obj.metaIndex || {};
    this.inCodeBlock = obj.inCodeBlock
    this.singleLineBlockComment = obj.singleLineBlockComment
    this.description = obj.description || [];
    this.rawDescription = obj.rawDescription || []
    this.taskStartOnLine = obj.taskStartOnLine || 0
    this.commentStartOnLine = obj.commentStartOnLine || 0
    this.originalDescriptionLength = obj.originalDescriptionLength || this.description.length
    this.descriptionStartsWith = obj.descriptionStartsWith
    this.filteredListName = obj.filteredListName
    if (dontParse) return
    this.parseTodoTxt()
    this.allMeta = this.getMetaData()
    this.allContext = this.getContext()
    this.allTags = this.getTags()
    this.progress = this.getProgress()
    this.metaKeys = Object.keys(this.allMeta)
  }

  issueNumberRegExp () {
    return new RegExp(/:\/\/github\.com.*?\/issues\/\d+/)
  }

  get markdownBeforeText () {
    if (!this.beforeText) return ''
    const beforeText = this.beforeText
      .replace('<!--', '')
      .trim()
      .replace(/[^#]+/g, '')
    return beforeText.length > 0 ? `${beforeText} ` : ''
  }

  get content () {
    return this.getRawTextAndDescription()
  }

  get interpretedContent () {
    return this.getTextAndDescription()
  }

  getTextAndDescription () {
    const description = _clone(this.description)
    const text = this.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true})
    const descriptionMD = description.map(line => {
      return this.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true}, line)
    })

    return `${this.markdownBeforeText}${text}${lf}${descriptionMD.join(lf)}`.replace(/<!--\s*\[\s*([\s\S]*?)\s*\]\s*-->/gm, '$1')
  }

  getRawTextAndDescription () {
    const description = _clone(this.description)
    const text = this.text
    if (description.length < 1) return text
    const descriptionMD = description.join(lf)
    return `${text}${lf}${descriptionMD}`
  }

  getProgress () {
    const progress = {completed: 0, total: 0}
    const text = this.getRawTextAndDescription()
    if (!text) return progress
    const checks = text.match(/- \[[x| ]\]/g)
    if (!checks) return progress
    return {completed: checks.filter(match => match.includes('x')).length, total: checks.length}
  }

  // TODO:10 Refactor and remove getContent in favor of content +refactor
  getContent () {
    return this.getRawTextAndDescription()
  }

  getIssueNumbersFromDesc () {
    let numbers = []
    let issueURL = this.text.match(this.issueNumberRegExp())
    if (issueURL) numbers.push(issueURL[0].split('/').pop())
    else {
      const match = this.description.filter(desc => this.issueNumberRegExp().test(desc))
      numbers = match.map(line => line.match(this.issueNumberRegExp())).map(result => result[0].split('/').pop())
    }

    return numbers
  }

  getIssueNumbers (issueMetaKey) {
    let numbers = []
    if (this.hasIssueURL()) {
      numbers = this.getIssueNumbersFromDesc()
    } else {
      numbers = this.meta[issueMetaKey] || this.meta['gh'] || [];
    }
    return numbers
  }

  hasIssueURL () {
    return this.issueNumberRegExp().test(this.text) || this.description.filter(desc => this.issueNumberRegExp().test(desc)).length > 0
  }

  hasIssueNumber (number) {
    return this.getIssueNumbers().includes(number.toString())
  }

  addIssue (issue, blame, issueMetaKey) {
    const task = this
    task.description.push(`- <${issue.html_url}>`)
    if (blame) {
      if (blame.name) task.description.push(blame.name)
      if (blame.email) task.description.push(blame.email)
    }
    const issueIds = task.meta[issueMetaKey || 'gh']
    if (issueIds) task.meta[issueMetaKey || 'gh'] = issueIds.filter(id => id !== issue.number.toString())
    // FIXME:20 This should not be used until we modify it to leave existing todo.txt alone, remove it in place and add new to first line of description
    // <!-- completed:2020-02-19T21:47:54.955Z -->
    // task.updateTodoTxt();
  }

  removeIssue (issue) {
    this.description = this.description.filter(line => line.replace(/^-/,'').trim() !== `<${issue.html_url}>`)
  }

  get listId () {
    return this.filteredListName || this.list
  }

  get path () {
    return this.source.path
  }

  toJSON() {
    return _assign({}, this, {
      allTags: this.allTags,
      allContext: this.allContext,
      allMeta: this.allMeta
    })
  }
}

Task.Types = {
  CODE: "CODE",
  HASHTAG: "HASHTAG",
  MARKDOWN: "MARKDOWN"
};

Task.TagsRegExp = /(^|\s)[+#](\S+)/gi;
Task.getTags = function(text) {
  const tags = []
  var codePositions = Task.getMarkdownCodePositions(text)
  var result, re = new RegExp(Task.TagsRegExp);

  while ((result = re.exec(text)) !== null) {
    if (Task.isResultInMarkdownCode(codePositions, result.index)) continue;
    const tag = result[2]
    if (!tags.includes(tag)) tags.push(tag);
  }

  return tags;
};

Task.ContextRegExp = /(^|\s)\@(\S+)/gi;
Task.getContext = function(text) {
  const context = []
  var codePositions = Task.getMarkdownCodePositions(text)
  var result, re = new RegExp(Task.ContextRegExp);

  while ((result = re.exec(text)) !== null) {
    if (Task.isResultInMarkdownCode(codePositions, result.index)) continue;
    const con = result[2]
    if (!context.includes(con)) context.push(con);
  }

  return context;
};

// Task.MetaRegExp = /(\w+?):(?!\/\/)([:\w-\.\$]+)/g;
Task.MetaRegExp = /(^|\s)([^\d\W\s]+?):(?!\/\/)([:\w-\.\$]+)/g;
Task.getMetaData = function(task) {
  var text = Task.isTask(task) ? task.getRawTextAndDescription() : task
  var meta = {};
  Task.eachMetaInContent(text, result => {
    var key = result[2];
    var val = result[3];
    if (!meta[key]) meta[key] = [];
    if (!meta[key].push) return
    meta[key].push(val);
    if (DATE_META_KEYS.includes(key)) {
      try {
        const date = new Date(val)
        task[key] = date.toISOString()
        task[`${key}Date`] = date.toISOString()
      } catch(e) {}
    }
  })
  return meta;
};

Task.eachMetaInContent = function(content, cb) {
  var codePositions = Task.getMarkdownCodePositions(content)
  var result, re = new RegExp(Task.MetaRegExp);
  while((result = re.exec(content)) !== null) {
    const index = result.index
    if (Task.isResultInMarkdownCode(codePositions, index)) continue;
    var key = result[2];
    if (/[\(<]{1}(http|ssh|ftp|git)/.test(key)) continue;
    if (!/^[^$][^\s\.]+$/.test(key)) continue;
    cb(result)
  }
}

Task.addToLastMetaInContent = function(content, toAdd, newLine) {
  let newContent = content
  Task.eachMetaInContent(content, result => {
    const metaTextMatched = result[0]
    const index = result.index
    const pos = index + metaTextMatched.length
    const prefix = newLine ? '\n' : ' '
    newContent = content.slice(0, pos) + `${prefix}${toAdd}` + content.slice(pos);
  })
  if (newContent.length > content.length) return newContent
  return content += `${prefix}${toAdd}`

}

/**
 * Description
 * @method isTask
 * @param {} task
 * @return BinaryExpression
 */
Task.isTask = function(task) {
  return task instanceof Task;
};

Task.getMarkdownCodePositions = function (text) {
  const re = /`([^`]+)`/g
  let result
  let positions = []
  while ((result = re.exec(text)) !== null) {
    const start = result.index
    const end = start + result[0].length
    positions.push({start, end})
  }
  return positions
}

Task.isResultInMarkdownCode = function (positions, index) {
  for (let i = 0; i < positions.length; i++) { 
    const {start, end} = positions[i]
    if (index > start && index < end) return true
  }
  return false
}


Task.prototype.parseTodoTxt = function() {
  // #BACKLOG:10 #hashtags should be treated like todo.txt tags gh:78 id:4 +enhancement

  this.tags = Task.getTags(this.getRawTextAndDescription());
  this.context = Task.getContext(this.getRawTextAndDescription());
  this.meta = Task.getMetaData(this);
};

Task.removeTags = function (text) {
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(new RegExp(Task.TagsRegExp), (match, p1, p2, offset) => {
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ''
  })
}

Task.removeContext = function (text) {
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(new RegExp(Task.ContextRegExp), (match, p1, p2, offset) => {
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ''
  })
}

Task.prototype.updateContext = function() {
  // TODO:240 implement updateContext id:1 gh:124
  var self = this;
  if (this.context) {
    let text = Task.removeContext(this.text)
    this.context.forEach(context => {
      text += ` @${context}`
    });
    this.text = text
  }
};

Task.removeMetaDataFromText = function (text) {
  let re = new RegExp(Task.MetaRegExp)
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(re, (match, p1, p2, p3, offset) => {
    if (/[\(<]{1}(http|ssh|ftp|git)/.test(p1)) return match;
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ''
  })
}

Task.prototype.getTags = function() {
  if (!this.tags) this.tags = []
  return this.tags.concat(this.frontMatter.tags);
};

Task.prototype.getContext = function() {
  if (!this.context) this.context = []
  return this.context.concat(this.frontMatter.context);
};

Task.prototype.getDueMeta = function() {
  const dueMeta = this.allMeta.due
  if (dueMeta) return dueMeta[0]
}

Task.prototype.getMetaData = function() {
  const meta = _clone(this.frontMatter.meta) || []
  Object.entries(meta).forEach(([key, val]) => {
    if (this.meta[key]) meta[key].concat(this.meta[key])
  })
  return _assign({}, this.meta, meta);
};

Task.prototype.getListTrackingMeta = function(lists) {
  const taskMeta = this.getMetaData()
  let listTrackingMeta = []
  lists.forEach(list => {
    if (taskMeta[list]) {
      const listMeta = taskMeta[list].map(timestamp => ({list, timestamp}))
      listTrackingMeta = listTrackingMeta.concat(listMeta)
    }
  })
  return fastSort(listTrackingMeta).by({asc: 'timestamp'})
}

Task.prototype.hasListChanged = function(lists) {
  const listTrackingMeta = this.getListTrackingMeta(lists)
  return listTrackingMeta.length === 0 || listTrackingMeta.pop().list !== this.list
}

Task.prototype.hasMetaData = function(key, value) {
  var meta = this.meta[key];
  if (!meta) return false;
  if (Array.isArray(value)) return _isEqual(value.sort() ,meta.sort());
  return meta.includes(value);
};

/**
 * Returns metadata as list with links
 * @method getMetaDataWithLinks
 * @param {} repository config
 * @return Array
 */
Task.prototype.getMetaDataWithLinks = function(config) {
  var self = this;
  var meta = [];
  var metaData = this.allMeta;
  if (metaData) {
    Object.getOwnPropertyNames(metaData).sort().forEach(function(metaKey) {
      var valList = metaData[metaKey];
      valList.forEach(function(value) {
        meta.push({
          key: metaKey,
          value: value,
          link: self.getMetaLink(config, metaKey, value)
        });
      });
    });
  }

  return meta;
};

Task.prototype.getMetaLink = function(config, metaKey, metaValue) {
  var metaConfig = config.meta && config.meta[metaKey];
  if (!metaConfig || !metaValue) return;
  return {
    title: util.format(metaConfig.titleTemplate, metaValue),
    url: util.format(metaConfig.urlTemplate, metaValue),
    icon: metaConfig.icon
  };
};

Task.prototype.toString = function() {
  return util.format("file:%s, line:%d, text:%s, id:%s", this.source.path, this.line, this.text, this.id);
};

/**
 * Description
 * @method getRepoId
 * @return MemberExpression
 */
Task.prototype.getRepoId = function() {
  return this.repoId;
};

/**
 * Description
 * @method getSource
 * @return MemberExpression
 */
Task.prototype.getSource = function() {
  return this.source;
};

/**
 * Description
 * @method getId
 * @return MemberExpression
 */
Task.prototype.getId = function() {
  return this.id;
};

/**
 * Description
 * @method getList
 * @return MemberExpression
 */
Task.prototype.getList = function() {
  return this.list;
};

/**
 * Description
 * @method getText
 * @return text
 */
Task.prototype.getText = function(opts, text) {
  if (!text) text = this.text;
  if (opts) {
    if (opts.stripMeta) {
      text = Task.removeMetaDataFromText(text)
    }
    if (opts.stripTags) {
      text = Task.removeTags(text)
    } else if (this.fontMatter && this.frontMatter.tags) {
      this.frontMatter.tags.forEach(tag => text += ` +${tag}`)
    }
    if (opts.stripContext) {
      text = Task.removeContext(text)
    } else if (this.fontMatter && this.frontMatter.context) {
      this.frontMatter.context.forEach(context => text += ` @${context}`)
    }
  }
  return text;
};

Task.prototype.getDescription = function(opts) {
  return this.description.map(line => {
    return this.getText(opts, line)
  }).join(lf)
};

Task.prototype.getChecksFromHtml = function(html) {
  let $ = cheerio.load(html);
  let checks = $('.task-description').find("input[type='checkbox']");
  const result = [];
  checks.each(function () {
    result.push($(this).is(':checked'));
  })
  return result;
}

/**
 * Description
 * @method order
 * @return MemberExpression
 */
Task.prototype.order = function() {
  return this.order;
};

/**
 * Description
 * @method getLine
 * @return MemberExpression
 */
Task.prototype.getLine = function() {
  return this.line;
};

Task.prototype.getType = function() {
  return this.type;
};

/**
 * Description
 * @method equals
 * @param {} task
 * @return LogicalExpression
 */
Task.prototype.equals = function(task) {
  if (!task) return;
  return task.getRepoId() == this.getRepoId() &&
         task.getSource().path == this.getSource().path &&
         task.getId() == this.getId();
};

module.exports = Task;
