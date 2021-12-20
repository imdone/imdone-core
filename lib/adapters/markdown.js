const checkbox = require('markdown-it-checkbox')
const imageSize = require('markdown-it-imsize')
const emoji = require('markdown-it-emoji') // used in taskEditor
const mark = require('markdown-it-mark')
const removeMD = require('remove-markdown') // used in epic-plugins
const wikilinks = require('@kwvanderlinde/markdown-it-wikilinks')

const MarkdownIt = require('markdown-it')
const md = new MarkdownIt({html: true, breaks: true})

md.use(checkbox)
.use(mark)
.use(emoji)
.use(imageSize)
.use(wikilinks(
  { 
    linkPattern: /\[\[([\w\s\d-/]+)(\|([\w\s\d-/]+))?\]\]/,
    uriSuffix: '.md',
    postProcessPageName (pagename) {
      return pagename.trim()
    }
  }
))

module.exports = {
  renderMarkdown (markdown) {
    return md.render(markdown)
  },
  removeMD  
}