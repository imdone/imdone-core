const Task = require('./task')
const _path = require('path')
const template = require('lodash.template')
const _pick = require('lodash.pick')
const _isFunction = require('lodash.isfunction')
const _isEmpty = require('lodash.isempty')
const _get = require('lodash.get')
const eol = require('eol')
const allEmoji = require('markdown-it-emoji/lib/data/full.json')

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

    init (totals = project.totals) {
      this.totals = totals
      this.onTaskUpdate() 
      this.initProps()
      this.initComputed()
      // console.time('init data')
      this.initData()
      // console.timeEnd('init data')
      this.initLinks()
      return this
    }

    onTaskUpdate () {
      pluginManager.onTaskUpdate(this)
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

    getCardLinks () {
      const links = _get(this.settings, 'cards.links', [])
      const allLinks = this.frontMatter.links
        ? [...links, ...this.frontMatter.links]
        : [...links]
      return allLinks.filter(({display}) => {
        if (!display) return true
        try {
          return display.call({...this.data, ...this.desc})
        } catch (e) {
          console.error(e)
        }
        return false
      })
    }

    initLinks () {
      this.links = this.getCardLinks()
        .map(({pack, icon, title, href }, index) => {
          href = this.formatContent(href).content
          title = this.formatContent(title).content
          const action = JSON.stringify({index})
          return {pack, icon, title, href, action} // Use index instead of action
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
      // console.time('description time')
      this.desc = this.getDescription()
      // console.timeEnd('description time')
      this.data = {...data, ...this.desc}
    }

    getEncodedContent (content) {
      const linkRegex = /\[([^[]+)\](\((.*)\))/gm
      let plainDescription = removeMD(content.replace(linkRegex, '$3'), {stripListLeaders: false})
      plainDescription = plainDescription.replace(/:(\w+):/g, (match, p1) => {
        return allEmoji[p1]
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
      return this.getEncodedContent(this.format(content, mustache))
    }

    format (content, mustache) {
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

      return content
    }

    getCardMarkdown () {
      // - eliminate <!--[ ]--> wrappers
      const taskMD = this.interpretedContent
                          .replace(/%%[\s\S]*?%%/g, '')
                          .replace(/<\!--\s*?-->/sg,'')
                          .trim()
      // - Split on eol and append lines until visible line count equals lines
      const displayContent = []
      const rawContent = []
      const mdArray = eol.split(taskMD)
      let titleFound = false
      mdArray.forEach((line) => {
          rawContent.push(line)
          if (!titleFound && line === `${this.beforeText}${this.text}`) {
          line = `<span class="imdone-card-title">${lf}${lf}${line}${lf}${lf}</span>${lf}`
          titleFound = true
        }
        displayContent.push(line)
      })
      const totalLines = displayContent.length
      const markdown = displayContent.join(eol.lf)
      const rawMarkdown = rawContent.join(eol.lf)
      const truncLines = this.maxLines + 5 // lfs in title
      return {totalLines, truncLines, markdown, rawMarkdown }
    }

    getHtml (content, truncLines) {
      const html = renderMarkdown(content)
      const mdArray = eol.split(content)
      let truncHtml = null
      if (mdArray.length > truncLines) {
        mdArray.length = truncLines
        truncHtml = renderMarkdown(mdArray.join(eol.lf))
      }
      return { html, truncHtml }
    }

    getDescription () {
      const {truncLines, markdown, rawMarkdown } = this.getCardMarkdown()
      let {encodedText, encodedMD, content} = this.formatContent(markdown, true)
      const formattedRawMarkdown = this.formatContent(rawMarkdown, true).content
      const { html, truncHtml } = this.getHtml(content, truncLines)
      return {
        html,
        truncHtml,
        encodedText,
        encodedMD,
        markdown: content,
        rawMarkdown: formattedRawMarkdown,
        htmlLength: html.length,
        htmlTruncLength: truncHtml && truncHtml.length,
        isOverMaxLines: truncHtml && (truncHtml.length < html.length)
      }
    }
  }

  return new Card(task, dontParse)
}
