import { Task } from './task.js'
import _path from 'path'
import _pick from 'lodash.pick'
import _isFunction from 'lodash.isfunction'
import _isObject from 'lodash.isobject'
import _isEmpty from 'lodash.isempty'
import eol from 'eol'
import { getFunctionSignature } from './adapters/parsers/function-parser.js'
import { format, encodeMarkdownLinks, interpolate } from './adapters/parsers/content-transformer.js'
import { removeMD } from './adapters/markdown.js'
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const allEmoji = require("markdown-it-emoji/lib/data/full.json")

const CONTENT_TOKEN = '__CONTENT__'
const lf = String(eol.lf)

export function newCard(task, _project, dontParse) {
  const project = _project
  const pluginManager = _project && _project.pluginManager

  class Card extends Task {
    constructor(task, dontParse) {
      super(project.config, task, dontParse)
    }

    get settings() {
      return project.config.settings || {}
    }

    get maxLines() {
      return project.config.maxLines
    }

    get interpretedContent() {
      return this.innerInterpretedContent || this.getTextAndDescription()
    }

    set interpretedContent(value) {
      this.innerInterpretedContent = value
    }

    // TODO This should take an object of project level data and make it available to the card
    // <!--
    // order:-120
    // -->
    init(totals = project.totals) {
      this.updateLastLine()
      this.totals = totals
      this.onTaskUpdate()
      this.initProps()
      this.initComputed()
      this.initData()
      this.initActions()
      return this
    }

    onTaskUpdate() {
      // TODO We should be mapping to the imdone-api task
      // #imdone-1.45.0
      // <!--
      // order:-20
      // -->
      const interpretedContent = pluginManager.onTaskUpdate(this)
      if (interpretedContent && interpretedContent.length > 0) {
        this.interpretedContent = interpretedContent
      }
    }

    initProps() {
      const props = this?.settings?.cards?.props ?? {}
      this.props = this.frontMatter.props
        ? { ...props, ...this.frontMatter.props }
        : { ...props }
    }

    initComputed() {
      const computed = this?.settings?.cards?.computed ?? {}
      this.computed = this.frontMatter.computed
        ? { ...computed, ...this.frontMatter.computed }
        : { ...computed }
    }

    initActions() {
      this.links = []
      if (!pluginManager) return
      this.links = [...pluginManager.getCardActions(this)]
    }

    get projectPath() {
      return project.path
    }

    get relPath() {
      return this.source ? this.source.path : undefined
    }

    get fullPath() {
      return this.source ? _path.join(project.path, this.source.path) : undefined
    }

    get defaultData() {
      return {
        ..._pick(
          this,
          ...['beforeText',
          'rawTask',
          'id',
          'text',
          'progress',
          'line',
          'lastLine',
          'list',
          'source',
          'due',
          'created',
          'started',
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
          'totals',
          'topics'].sort()
        ),
      }
    }

    // TODO Add isInCodeFile property to card
    // <!--
    // order:-115
    // -->
    initData() {
      const props = { ...this.props, content: CONTENT_TOKEN }
      const computed = { ...this.computed }
      const defaultData = this.defaultData
      try {
        for (let [key, value] of Object.entries(computed)) {
          let computedValue = value.toString()
          const computedProps = { ...props, ...computed, ...defaultData }
          if (_isFunction(value) && !_isEmpty(props)) {
            try {
              // Call the computed function for a value
              computedValue = value.call(computedProps)
            } catch (e) {
              console.info(
                `Unable to compute key: ${key} with value: ${computedValue}`,
                e.message
              )
            }
          } else {
            try {
              // Use template for the computed value
              computedValue = interpolate(value, computedProps, { tags: ['${', '}'] })
            } catch (e) {
              console.info(
                `Unable to compute key: ${key} with value: ${computedValue}`,
                e.message
              )
            }
          }
          computed[key] = computedValue
        }
      } catch (e) {
        console.error(e)
      }

      const pluginData = pluginManager
        ? { ...pluginManager.getCardProperties(defaultData) }
        : {}
      const data = {
        ...pluginData,
        ...props,
        ...computed,
        ...defaultData
      }

      const keys = Object.keys(data).map((key) => {
        const value = data[key]
        if (_isFunction(value)) {
          key = getFunctionSignature(value)
        }
        return key
      })
      
      keys.forEach((key) => {
        const value = data[key]
        if (_isObject(value) && !Array.isArray(value)) {
          keys.push(...Object.keys(value).map((k) => `${key}.${k}`))
        }
      })
      this.dataKeys = keys

      this.data = { ...data }
      this.updateDescriptionData()
    }

    updateDescriptionData() {
      this.desc = this.getDescriptionData()
      this.data = { ...this.data, ...this.desc }
    }

    getEncodedContent(content) {
      const linkRegex = /\[([^[]+)\](\((.*)\))/gm
      const plainDescription = removeMD(content.replace(linkRegex, '$3'), {
        stripListLeaders: false,
      }).replace(/:(\w+):/g, (match, p1) => {
        return allEmoji[p1]
      })
      const encodedText = encodeURIComponent(plainDescription)
      const encodedMD = encodeURIComponent(content)
      content = content.replace(CONTENT_TOKEN, encodedText)
      content = encodeMarkdownLinks(content)
      return { encodedMD, encodedText, content }
    }

    formatContent(content, mustache) {
      return this.getEncodedContent(this.format(content, mustache))
    }

    format(content, mustache) {
      const projectData = project ? { ...project.data } : {}
      const data = { ...this.data, ...projectData }
      return format(content, data, mustache)
    }

    getCardMarkdown() {
      // - eliminate <!--[ ]--> wrappers
      let taskMD = this.interpretedContent
        .replace(/%%[\s\S]*?%%/g, '')
        .replace(/<\!--\s*?-->/gs, '')
        .trim()
      // taskMD = this.replaceImagePaths(taskMD)
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
      this.truncLines = titleFound ? this.maxLines + 5 : this.maxLines
      const totalLines = displayContent.length
      const markdown = displayContent.join(eol.lf)
      const rawMarkdown = rawContent.join(eol.lf)
      return { totalLines, markdown, rawMarkdown }
    }

    getHtml(content) {
      const html = project.renderMarkdown(content, this.fullPath)
      const mdArray = eol.split(content)
      let truncHtml
      if (mdArray.length > this.truncLines) {
        mdArray.length = this.truncLines
        truncHtml = project.renderMarkdown(mdArray.join(eol.lf), this.fullPath)
      }
      return { html, truncHtml }
    }

    getDescriptionData() {
      const { markdown, rawMarkdown } = this.getCardMarkdown()

      let { encodedText, encodedMD, content } = this.formatContent(
        markdown,
        true
      )
      const formattedRawMarkdown = this.formatContent(rawMarkdown, true).content
      const { html, truncHtml } = this.getHtml(content)
      const title = this.format(this.text, true)
      return {
        title,
        html,
        truncHtml,
        encodedText,
        encodedMD,
        markdown: content,
        rawMarkdown: formattedRawMarkdown,
        htmlLength: html.length,
        htmlTruncLength: truncHtml && truncHtml.length,
        isOverMaxLines: truncHtml && truncHtml.length < html.length,
      }
    }
  }

  return new Card(task, dontParse)
}
