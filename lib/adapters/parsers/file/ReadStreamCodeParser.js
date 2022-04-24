const path = require('path')
const ReadStreamTaskParser = require('./ReadStreamTaskParser')
const HashStyleTaskParser = require('../task/HashStyleTaskParser')
const HashStyleOrderMetaTaskParser = require('../task/HashStyleOrderMetaTaskParser')
const MarkdownStyleTaskParser = require('../task/MarkdownStyleTaskParser')
const extractComments = require('multilang-extract-comments')
const eol = require('eol')
const ReadLine = require('readline')
const { Readable } = require('stream')

// DOING:-30 ## create ReadStreamCodeParser
// #adapter
// [${source.path}](${source.path})
// <!-- epic:"Release 1.29.0" -->

async function streamToString(stream) {
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf-8')
}

function stringToStream(string) {
  const lines = eol.split(string).map((line) => line + String(eol.auto))
  return Readable.from(lines)
}

module.exports = class ReadStreamCodeParser extends ReadStreamTaskParser {
  constructor(readStream, filePath, lang) {
    super(readStream)
    this.filePath = filePath
    this.lang = lang
    this.taskParsers = [
      new HashStyleTaskParser(),
      new HashStyleOrderMetaTaskParser(),
      new MarkdownStyleTaskParser(),
    ]
  }

  async init() {
    const content = await streamToString(this.readStream)
    this.comments = await this.extractComments(content)
    this.readStream = stringToStream(content)
    this.readInterface = this.getReadInterface()

    let line = null
    let lines = []
    let lineNo = 1
    let comment = null
    do {
      const { value, done } = await this.readLine()
      line = done ? null : value
      comment = this.getCommentAtLine(line, lineNo)
      let lineInComment = ''
      if (comment) {
        lineInComment = comment.lines[lineNo - comment.begin]
      }
      lines.push(lineInComment)
      lineNo += 1
    } while (line !== null)
    this.readInterface.close()
    this.readStream = Readable.from(
      lines.map((line) => line + String(eol.auto))
    )
    this.readInterface = this.getReadInterface()
  }

  async readTask() {
    // DOING: After reading task, decorate it with the comment info
  }

  getCommentAtLine(line, lineNo) {
    return this.comments.find(
      (comment) => lineNo >= comment.begin && lineNo <= comment.end
    )
  }

  getReadInterface() {
    return ReadLine.createInterface({
      input: this.readStream,
      crlfDelay: Infinity,
      console: false,
    })
  }

  async extractComments(content) {
    const lang = this.lang
    const multiLineComment = lang.block
      ? [
          {
            start: lang.block.start,
            middle: lang.block.ignore,
            end: lang.block.end,
          },
        ]
      : []
    const options = {
      pattern: {
        name: lang.name,
        nameMatchers: [path.extname(this.filePath)],
        singleLineComment: [{ start: lang.symbol }],
        multiLineComment,
      },
    }
    const comments = extractComments(content, options)
    const contentLines = eol.split(content)
    return Object.values(comments).map((comment) => {
      const lines = eol.split(comment.content)
      const linesInContent = contentLines.slice(comment.begin - 1, comment.end)
      let contentStartIndex = linesInContent.findIndex((line, index) =>
        line.includes(lines[0])
      )
      for (let i = 0; i < contentStartIndex; i++) {
        lines.unshift('')
      }
      return {
        ...comment,
        lines,
      }
    })
  }
}
