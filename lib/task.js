'use strict';

var _      = require('lodash'),
    util   = require('util'),
    eol    = require('eol'),
    lf     = String(eol.lf),
    cheerio = require('cheerio'),
    marked = require('./tools').marked;

/**
 * Description
 * @method Task
 * @param {} obj
 * @return
 */
class Task {
  constructor(obj, dontParse) {
    if (!(_.isObject(obj))) throw new Error("obj must be an Object");
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
    this.inCodeBlock = obj.inCodeBlock
    this.singleLineBlockComment = obj.singleLineBlockComment
    this.description = obj.description || [];
    this.rawDescription = obj.rawDescription || []
    this.taskStartOnLine = obj.taskStartOnLine || 0
    this.commentStartOnLine = obj.commentStartOnLine || 0
    this.originalDescriptionLength = obj.originalDescriptionLength || this.description.length
    this.descriptionStartsWith = obj.descriptionStartsWith
    if (dontParse) return
    this.parseTodoTxt()
    this.progress = this.getProgress()
  }

  get allTags() {
     return this.getTags()
  }

  get allContext() {
    return this.getContext()
  }

  get allMeta() {
    return this.getMetaData()
  }

  issueNumberRegExp () {
    return new RegExp(/:\/\/github\.com.*?\/issues\/\d+/)
  }

  getTextAndDescription () {
    const description = _.clone(this.description)
    const text = this.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true})
    const descriptionMD = description.map(line => {
      return this.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true}, line)
    })
    const beforeText = this.beforeText || ''
    return `${beforeText}${text}${lf}${descriptionMD.join(lf)}`
  }

  getRawTextAndDescription () {
    const description = _.clone(this.description)
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

  toJSON() {
    return _.assign({}, this, {
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

Task.TagsRegExp = /(^|\s)\+(\S+)/gi;
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
  var codePositions = Task.getMarkdownCodePositions(text)
  var result, re = new RegExp(Task.MetaRegExp);
  while((result = re.exec(text)) !== null) {
    const index = result.index
    // const charBefore = result.input.substring(index-1, index)
    // if (charBefore !== " " && charBefore !== '') continue
    if (Task.isResultInMarkdownCode(codePositions, index)) continue;
    var key = result[2];
    if (/[\(<]{1}(http|ssh|ftp|git)/.test(key)) continue;
    if (!/^[^$][^\s\.]+$/.test(key)) continue;
    var val = result[3];
    if (!meta[key]) meta[key] = [];
    if (!meta[key].push) continue
    meta[key].push(val);
    if (['due', 'created', 'remind', 'completed'].includes(key)) {
      try {
        const date = new Date(val)
        task[key] = date.toISOString()
        task[`${key}Date`] = date
      } catch(e) {}
    }
  }
  return meta;
};

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

// FIXME:30 This should not be used until we modify it to leave existing todo.txt alone, remove it in place and add new to first line of description
// <!-- completed:2020-02-19T21:47:54.956Z -->
// Task.prototype.updateTodoTxt = function() {
//   console.log('******** This should not be used until we modify it to leave existing todo.txt alone, remove it in place and add new to first line of description ********')
//   console.log(`*** Updating todo txt path:${this.source.path} line:${this.line} text:${this.text} ***`)
//   this.updateMetaData();
//   this.updateTags();
//   this.updateContext();
// };

Task.removeTags = function (text) {
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(new RegExp(Task.TagsRegExp), (match, p1, p2, offset) => {
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ' '
  })
}
Task.prototype.updateTags = function() {
  // TODO:250 implement updateTags id:7 gh:93
  if (this.tags) {
    let text = Task.removeTags(this.text)
    this.tags.forEach(tag => {
      text += ` +${tag}`
    })
    this.text = text
  }
};

Task.removeContext = function (text) {
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(new RegExp(Task.ContextRegExp), (match, p1, p2, offset) => {
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ' '
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

Task.removeMetaData = function (text) {
  let re = new RegExp(Task.MetaRegExp)
  const positions = Task.getMarkdownCodePositions(text)
  return text.replace(re, (match, p1, p2, offset) => {
    const charBefore = text.substring(offset-1, offset)
    if (!/\s/.test(charBefore) && charBefore != '') return match
    if (/[\(<]{1}(http|ssh|ftp|git)/.test(p1)) return match;
    if (Task.isResultInMarkdownCode(positions, offset)) return match
    return ''
  })
}
// Update task text with metadata
Task.prototype.updateMetaData = function() {
  let re = new RegExp(Task.MetaRegExp)
  const positions = Task.getMarkdownCodePositions(this.text)
  this.text = Task.removeMetaData(this.text)
  var meta = this.meta
  if (meta) {
    Object.entries(meta).forEach(([key, values]) => {
      _.uniq(values).forEach((val) => {
        this.text += ` ${key}:${val}`
      })
    })
  }
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
  const dueMeta = this.getMetaData().due
  if (dueMeta) return dueMeta[0]
}

Task.prototype.getMetaData = function() {
  const meta = _.clone(this.frontMatter.meta) || []
  Object.entries(meta).forEach(([key, val]) => {
    if (this.meta[key]) meta[key].concat(this.meta[key])
  })
  return _.assign({}, this.meta, meta);
};

Task.prototype.hasMetaData = function(key, value) {
  var meta = this.meta[key];
  if (!meta) return false;
  if (_.isArray(value)) return _.isEqual(value.sort() ,meta.sort());
  return meta.includes(value);
};

Task.prototype.removeMetaData = function(key, val) {
  if (val && this.meta[key]) this.meta[key] = _.without(this.meta[key], val.toString());
  else delete this.meta[key];
  this.updateMetaData()
};

Task.prototype.addMetaData = function(key, val) {
  if (Array.isArray(val)) {
    var self = this;
    val.forEach(function(val) {
      self._addMetaData(key, val);
    });
  } else {
    this._addMetaData(key, val);
  }
};

Task.prototype._addMetaData = function(key, val) {
  if (!this.meta) this.meta = {};
  if (!this.meta[key]) this.meta[key] = [];
  val = val.toString();
  this.meta[key].push(val);
  this.updateMetaData()
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
  var metaData = this.getMetaData();
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
      text = Task.removeMetaData(text)
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
