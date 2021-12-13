const Task = require('./task')
const _path = require('path')
const template = require('lodash.template')
const _pick = require('lodash.pick')
const _isFunction = require('lodash.isfunction')
const _isEmpty = require('lodash.isempty')
const _get = require('lodash.get')
const cheerio = require('cheerio')
const eol = require('eol')

const {
  removeMD,
  renderMarkdown
} = require('./adapters/markdown')

const CONTENT_TOKEN = '__CONTENT__'
const lf = String(eol.lf)

function  removeDisplayComments (description) {
  return description.replace(/<!--\s*\[([\s\S]*?)\]\s*-->/g, '$1')
}

module.exports = function newCard(task, _project, dontParse) {

  const project = _project
  const pluginManager = _project && _project.pluginManager

  class Card extends Task {
    constructor (task, dontParse) {
      super(project.config, task, dontParse)
    }

    get settings () {
      return project.config.settings || {}
    }

    get maxLines () {
      return _get(this.settings, 'cards.maxLines')
    }

    get interpretedContent () {
      return this.innerInterpretedContent || this.getTextAndDescription()
    }
  
    set interpretedContent (value) {
      this.innerInterpretedContent = value
    }

    // TODO this should happen in the worker process
    init (totals) {
      this.totals = totals
      console.time('props time')
      this.initProps()
      console.timeEnd('props time')
      console.time('computed time')
      this.initComputed()
      console.timeEnd('computed time')
      console.time('data time')
      this.initData()
      console.timeEnd('data time')
      console.time('links time')
      this.initLinks()
      console.timeEnd('links time')
      return this
    }
    
    initProps () {
      const props = _get(this.settings, 'cards.props', {})
      this.props = this.frontMatter.props
        ? {...props, ...this.frontMatter.props}
        : {...props}
    }

    initComputed () {
      const computed = _get(this.settings, 'cards.computed', {})
      this.computed = this.frontMatter.computed
        ? {...computed, ...this.frontMatter.computed}
        : {...computed}
    }

    initLinks () {
      const links = _get(this.settings, 'cards.links', [])
      this.links = this.frontMatter.links
        ? [...links, ...this.frontMatter.links]
        : [...links]
        
      this.links = this.links.filter(({display}) => {
          if (!display) return true
          try {
            return display.call({...this.data, ...this.desc})
          } catch (e) {
            console.error(e)
          }
          return false
        })
        .map(({pack, icon, title, href, action}) => {
          href = this.formatContent(href).content
          title = this.formatContent(title).content
          return {pack, icon, title, href, action}
        })

      if (!pluginManager) return
      this.links =  [...this.links, ...pluginManager.getCardLinks(this)]
    }

    get projectPath () {
      return project.path
    }
    
    get relPath () {
      return this.source ? this.source.path : null
    }

    get fullPath () {
      return this.source ? _path.join(project.path, this.source.path) : null
    }

    get defaultData () {
      return {
        ..._pick(this, 
        'rawTask',
        'id',
        'text', 
        'progress', 
        'line', 
        'list', 
        'source', 
        'due', 
        'created', 
        'completed', 
        'tags', 
        'context', 
        'meta', 
        'allTags', 
        'allContext', 
        'allMeta',
        'metaKeys',
        'content',
        'filteredListName',
        'interpretedContent',
        'projectPath',
        'relPath',
        'fullPath',
        'totals'
        )
      }
    }

    initData () {
      const props = {...this.props, content: CONTENT_TOKEN}
      const computed = {...this.computed}
      const cardData = this.defaultData
      try {
        for (let [key, value] of Object.entries(computed)) {
          let computedValue = value.toString()
          const computedProps = {...props, ...computed, ...cardData}
          if (_isFunction(value) && !_isEmpty(props)) {
            try {
              // Call the computed function for a value
              computedValue = value.call(computedProps)
            } catch (e) {
              console.info(`Unable to compute key: ${key} with value: ${computedValue}`, e.message)
            }
          } else {
            try {
              // Use template for the computed value
              computedValue = template(value)(computedProps)
            } catch (e) {
              console.info(`Unable to compute key: ${key} with value: ${computedValue}`, e.message)
            }
          }
          computed[key] = computedValue
        }
      } catch (e) {
        console.error(e)
      }

      const pluginData = pluginManager ? pluginManager.getCardProperties(cardData) : {}
      const data =  {
        ...pluginData,
        ...props, 
        ...computed, 
        ...cardData
      }

      this.data = {...data}
      console.time('description time')
      this.desc = this.getDescription()
      this.truncDesc = this.getDescription(this.maxLines)
      console.timeEnd('description time')
      this.data = {...data, ...this.desc}
    }

    getEncodedContent (content) {
      const linkRegex = /\[([^[]+)\](\((.*)\))/gm
      let plainDescription = removeMD(content.replace(linkRegex, '$3'), {stripListLeaders: false})
      plainDescription = plainDescription.replace(/:\w+:/g, match => {
        const html = renderMarkdown(match)
        const $ = cheerio.load(html)
        return $.text().trim()
      })
      const encodedText = encodeURIComponent(plainDescription)
      const encodedMD = encodeURIComponent(content)
      content = content
        .replace(CONTENT_TOKEN, encodedText)
        .replace(/(?<!!)\[(.*?)\]\((.*?)( ".*?")?\)/g, (match, p1, p2, p3) => { // URI encode file links
          const title = p3 || ''
          const link = `[${p1}](${p2.replace(/\s/g, '%20')}${title})`
          return link.replace(/%20(".*?"\))$/, ' $1')
        })
      return {encodedMD, encodedText, content}
    }

    formatContent (content, mustache) {
      const data = this.data
    
      const opts = { interpolate: /(?<!`)\${([\s\S]+?)}/g }
    
      if (mustache) content = removeDisplayComments(content)
    
      try {
        content = template(content, opts)(data)
      } catch (e) {
        content = content.replace(opts.interpolate, `~~\${${e}}~~`)
      }
    
      if (mustache) {
        const opts = { interpolate: /(?<!`){{([\s\S]+?)}}/g }
        try {
          content = template(content, opts)(data)
        } catch (e) {
          content = content.replace(opts.interpolate, `~~{{${e}}}~~`)
        }
      }
      // Fix list endings
      // const listEndingRegex = /(\n\s*([-+*]{1}|\d+.)\s.*[\n\r])([^1-9-+* \t])/gm
      // description = description.replace(listEndingRegex, '$1\n$3')
    
      return this.getEncodedContent(content)
    }

    getCardMarkdown (lines) {
      // - eliminate <!--[ ]--> wrappers
      const taskMD = this.interpretedContent.replace(/%%[\s\S]*?%%/g, '')
      // - Split on eol and append lines until visible line count equals lines
      const taskMDArray = []
      let commentTokens = 0
      let totalLines = 0
      const mdArray = eol.split(taskMD)
      let titleFound = false
      mdArray.forEach((line) => {
        if (/<!--/.test(line) && !/<!--\[/.test(line)) commentTokens++
        if (commentTokens === 0) totalLines++
        if (/-->/.test(line) && !/\]-->/.test(line)) commentTokens--
        if (lines && lines !== -1 && totalLines > lines) return
        if (!titleFound && line === `${this.beforeText}${this.text}`) {
          if (lines !== -1) line = `<span class="imdone-card-title">${lf}${lf}${line}${lf}${lf}</span>${lf}`
          titleFound = true
        }
        taskMDArray.push(line)
      })
      return {totalLines, content: taskMDArray.join(eol.lf)}
    }

    getDescription (lines) {
      const fullMarkdown = this.getCardMarkdown(-1)
      let {encodedText, encodedMD, content} = this.formatContent(fullMarkdown.content, true)
      const formattedDescription = this.formatContent(this.getCardMarkdown(lines).content, true).content
      
      const html = renderMarkdown(formattedDescription)
      const $ = cheerio.load(html)
    
      $('a').each(function () {
        const href = $(this).attr('href')
        if (/\w+:\/\/|mailto:.*@.*/.test(href)) return $(this).attr('target', '_blank')
        const [filePath, line] = href.split(':')
        $(this).attr('file-path', filePath)
        $(this).attr('file-line', line)
        $(this).attr('href', '#')
      })
    
      $('code[class*="language-"]').each(function () {
        const codeEl = $(this)
        const code = codeEl.text()
        const $toolbar = cheerio.load(`<div class="code-toolbar"><a href="#" class="copy-code">Copy Code</a></div>`)
        $toolbar('.copy-code').attr('data-code', code)
        codeEl.parent().after($toolbar('body').html())
      })
    
      const taskImgPath = this.relPath
      const repoPath = this.projectPath
      $('img').each(function () {
        const src = $(this).attr('src')
        if (!/\w+:\/\//.test(src)) {
          let imgPath = _path.join(repoPath, src)
          if (!taskImgPath) return $(this).attr('src', `file://${imgPath}`)
          const taskFileDirAry = taskImgPath.split(_path.sep)
          taskFileDirAry.pop()
          const taskFileDir = taskFileDirAry.join(_path.sep)
          const filePath = decodeURIComponent(_path.join(taskFileDir, src))
          const fullFilePath = _path.join(repoPath, filePath)
          $(this).attr('src', `file://${fullFilePath}`)
        }
      })
      //- BACKLOG:10 Support sorting of tasks in list id:43 +feature
      $('input[type=checkbox]').closest('li').css('list-style', 'none')
      // $('input[type=checkbox]').attr('disabled', 'true')
      return {
        html: $.html(),
        encodedText,
        encodedMD,
        markdown: content,
        isOverMaxLines: this.maxLines && fullMarkdown.totalLines > this.maxLines
      }
    }
  }

  return new Card(task, dontParse)
}
