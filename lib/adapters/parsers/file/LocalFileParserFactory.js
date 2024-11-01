const { createReadStream } = require('fs')
const ReadStreamMarkdownParser = require('./ReadStreamMarkdownParser')
const path = require('path')
const languages = require('../../../languages')
const ReadStreamCodeParser = require('./ReadStreamCodeParser')

function getLang(languages, filePath) {
  var lang = languages[path.extname(filePath)]
  return lang || { name: 'text', symbol: '' }
}

function getLanguages(config) {
  const configLanguages = config.languages || {}
  return { ...languages, ...configLanguages }
}

// DOING Use task line parsers for vs code extension and obsidian plugin
// <!--
// order:-10000030
// -->
module.exports = {
  async getFileParser(filePath, config) {
    const languages = getLanguages(config)
    const lang = getLang(languages, filePath)
    if (lang.name === 'text') {
      return new ReadStreamMarkdownParser(createReadStream(filePath), config)
    } else {
      const parser = new ReadStreamCodeParser(
        createReadStream(filePath),
        filePath,
        lang,
        config
      )
      await parser.init()
      return parser
    }
  },
}
