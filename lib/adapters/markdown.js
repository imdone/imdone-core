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
    linkPattern: /\[\[([\w\u00C0-\u017F\s\d-/]+)(\|([\w\u00C0-\u017F\s\d-/]+))?\]\]/,
    uriSuffix: '.md',
    postProcessPageName (pagename) {
      return pagename.trim()
    }
  }
))
.validateLink = () => true

module.exports = {
  renderMarkdown (markdown) {
    markdown = markdown.replace(/- \[-\] (.+)/gm, '- :no_entry_sign: ~~$1~~');
    return md.render(markdown)
  },
  removeMD  
}