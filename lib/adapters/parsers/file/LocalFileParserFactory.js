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

module.exports.getFileParser = async function getFileParser (filePath, config, readStream) {
  if (!readStream) {
    readStream = createReadStream(filePath)
  }
  const languages = getLanguages(config)
  const lang = getLang(languages, filePath)
  if (lang.name === 'text') {
    return new ReadStreamMarkdownParser(readStream, config)
  } else {
    const parser = new ReadStreamCodeParser(
      readStream,
      filePath,
      lang,
      config.lists
    )
    await parser.init()
    return parser
  }
}
