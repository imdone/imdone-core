import path from 'node:path'
import { ReadStreamTaskParser } from './ReadStreamTaskParser.js'
import { languages } from '../../../languages.js'
import { CodeStyleTaskParser } from '../task/CodeStyleTaskParser.js'

// TODO Move to readstream parsing for code to improve performance
// <!--
// #important
// #imdone-1.55.0
// order:-205
// -->
export class ReadStreamCodeParser extends ReadStreamTaskParser {
  constructor(readStream, filePath, lang, lists) {
    super(readStream)
    this.lists = lists
    this.filePath = filePath
    this.lang = lang
  }

  async init() {
    // TODO Getting tokens from lists should be done higher up in the controller
    // <!--
    // order:-10
    // -->
    const tokens = this.lists
      .map((list) => {
        if (typeof list === 'string') return list
        if (!list || typeof list !== 'object') return undefined
        return list.name
      })
      .filter(Boolean)
    this.cards = await this.parseCards(tokens)
  }

  async readTask() {
    return this.cards.shift()
  }

  async parseCards(tokens = ['TODO']) {
    const comments = await this.parseComments()
    const cards = []
    const listNames = tokens.map((token) =>
      typeof token === 'string' ? token : token?.name
    ).filter(Boolean)
    const parser = new CodeStyleTaskParser({
      includeList: (list) => listNames.includes(list),
      listExists: (list) => listNames.includes(list),
      lists: listNames.map((name) => ({ name })),
    })

    Object.keys(comments).forEach((comment) => {
      const {
        begin,
        end,
        content,
        inBlockComment,
        singleLineBlockComment,
      } = comments[comment]

      const lines = content.split('\n')
      let activeTask = null
      let taskLines = []

      const flushActiveTask = (lineNo) => {
        if (!activeTask) return
        cards.push({
          ...activeTask,
          content: `${taskLines.join('\n')}\n`,
          line: activeTask.line,
          lastLine: lineNo,
          inBlockComment,
          singleLineBlockComment,
        })
        activeTask = null
        taskLines = []
      }

      lines.forEach((line, index) => {
        const lineNo = begin + index
        const parsedTask = parser.parseLine(line, lineNo)

        if (parsedTask) {
          flushActiveTask(lineNo - 1)
          activeTask = parsedTask
          taskLines = [line]
          return
        }

        if (activeTask) {
          taskLines.push(line)
        }
      })

      flushActiveTask(end)
    })
    return cards
  }
  
  async parseComments() {
    const options = getLanguageOptions(this.filePath, this.lang);
    const comments = [];
    let lineNo = 0;
    let singleLineComment;
    let blockComment;

    const finishSingleLineComment = () => {
      if (!singleLineComment) return
      comments.push(singleLineComment)
      singleLineComment = undefined
    }

    for await (const line of this.readInterface) {
      lineNo++

      if (blockComment) {
        appendBlockCommentLine(blockComment, line, options)
        if (line.includes(options.block.end)) {
          blockComment.end = lineNo
          comments.push(blockComment)
          blockComment = undefined
        }
        continue
      }

      const blockStartIndex = getBlockStartIndex(line, options)
      const singleLineIndex = getSingleLineCommentIndex(line, options)
      const blockStartsFirst = blockStartIndex > -1 && (singleLineIndex === -1 || blockStartIndex < singleLineIndex)

      if (blockStartsFirst) {
        finishSingleLineComment()
        blockComment = {
          begin: lineNo,
          end: lineNo,
          contentLines: [],
          inBlockComment: true,
        }
        appendBlockCommentLine(blockComment, line, options)
        if (line.includes(options.block.end)) {
          comments.push(blockComment)
          blockComment = undefined
        }
      } else if (singleLineIndex > -1) {
        const content = line.slice(singleLineIndex + options.singleLineComment.length)
        if (!singleLineComment || singleLineComment.end !== lineNo - 1) {
          finishSingleLineComment()
          singleLineComment = {
            begin: lineNo,
            end: lineNo,
            contentLines: [],
            inBlockComment: false,
          }
        }
        singleLineComment.end = lineNo
        singleLineComment.contentLines.push(trimCommentLine(content))
      } else {
        finishSingleLineComment()
      }
    }

    finishSingleLineComment()
    if (blockComment) comments.push(blockComment)

    return comments.reduce((acc, comment, index) => {
      acc[index] = {
        begin: comment.begin,
        end: comment.end,
        content: formatCommentContent(comment.contentLines),
        inBlockComment: comment.inBlockComment,
        singleLineBlockComment: comment.inBlockComment && comment.begin === comment.end,
      }
      return acc
    }, {})
  }
  
}

function getBlockStartIndex(line, options) {
  if (!options.block.start || !options.block.end) return -1
  return line.indexOf(options.block.start)
}

function getSingleLineCommentIndex(line, options) {
  if (!options.singleLineComment) return -1
  return line.indexOf(options.singleLineComment)
}

function appendBlockCommentLine(comment, line, options) {
  const startIndex = line.indexOf(options.block.start)
  const contentStart = startIndex > -1 ? startIndex + options.block.start.length : 0
  const endIndex = line.indexOf(options.block.end, contentStart)
  const contentEnd = endIndex > -1 ? endIndex : line.length
  const content = line.slice(contentStart, contentEnd)

  comment.contentLines.push(trimCommentLine(content, options.block.ignore))
}

function trimCommentLine(line, ignoreToken) {
  let trimmed = line.trimStart()
  if (ignoreToken && trimmed.startsWith(ignoreToken)) {
    trimmed = trimmed.slice(ignoreToken.length).trimStart()
  }
  return trimmed.trimEnd()
}

function formatCommentContent(lines) {
  const trimmedLines = trimBlankCommentLines(lines)
  if (!trimmedLines.length) return ''
  return `${trimmedLines.join('\n')}\n`
}

function trimBlankCommentLines(lines) {
  const trimmedLines = [...lines]
  while (trimmedLines[0] === '') trimmedLines.shift()
  while (trimmedLines[trimmedLines.length - 1] === '') trimmedLines.pop()
  return trimmedLines
}

function getLanguageOptions(filePath, lang) {
  const extension = path.extname(filePath)
  const language = lang || languages[extension]
  const block = language?.block || {}

  return {
    singleLineComment: language?.symbol || '',
    block: {
      start: block.start,
      ignore: block.ignore,
      end: block.end,
    },
  }
}
