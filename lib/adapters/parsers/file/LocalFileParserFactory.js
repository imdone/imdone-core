const { createReadStream } = require('fs')
const ReadStreamMarkdownParser = require('./ReadStreamMarkdownParser')
const path = require('path')
const languages = require('../../../languages')
const Config = require('../../../config')
const ApplicationContext = require('../../../context/ApplicationContext')
const ReadStreamCodeParser = require('./ReadStreamCodeParser')

function getLang(languages, filePath) {
  var lang = languages[path.extname(filePath)]
  return lang || { name: 'text', symbol: '' }
}

function getLanguages(config) {
  const configLanguages = config.languages || {}
  return { ...languages, ...configLanguages }
}

module.exports = {
  async getFileParser(filePath) {
    const config = ApplicationContext.get(Config)
    const languages = getLanguages(config)
    const lang = getLang(languages, filePath)
    if (lang.name === 'text') {
      return new ReadStreamMarkdownParser(createReadStream(filePath))
    } else {
      const parser = new ReadStreamCodeParser(
        createReadStream(filePath),
        filePath,
        lang
      )
      await parser.init()
      return parser
    }
  },
}
