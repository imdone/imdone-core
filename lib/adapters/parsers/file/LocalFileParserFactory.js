import { createReadStream } from 'node:fs'
import { ReadStreamMarkdownParser } from './ReadStreamMarkdownParser.js'
import path from 'node:path'
import { languages } from '../../../languages.js'
import { ReadStreamCodeParser } from './ReadStreamCodeParser.js'


export function getLang(config, filePath) {
  const languages = getLanguages(config)
  var lang = languages[path.extname(filePath)]
  return lang || { name: 'text', symbol: '' }
}

export function getLanguages(config) {
  const configLanguages = config.languages || {}
  return { ...languages, ...configLanguages }
}

export async function getFileParser (filePath, config, readStream) {
  if (!readStream) {
    readStream = createReadStream(filePath)
  }
  const lang = getLang(config, filePath)
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
