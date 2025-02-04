const eol = require('eol')
const XRegExp = require('xregexp')

const FILE_TYPES = {
  MARKDOWN: 'markdown',
  CODE: 'code',
}
const TASK_TYPES = {
  CODE: 'CODE',
  HASHTAG: 'HASHTAG',
  MARKDOWN: 'MARKDOWN',
}

const DEFAULT_TOKEN_PREFIX = '#'
const START_TAG = '<card>'
const END_TAG = '</card>'
const CODE_STYLE_PATTERN = '([A-Z]+[A-Z-_]+?)((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$'
const LIST_NAME_PATTERN = '[\\p{L}0-9-_]{2,}' // [a-zA-Z-_]+?
const LINK_STYLE_REGEX = new XRegExp(
  `(\\[.*\\]\\s?)?(\\[(.+)\\]\\(#(${LIST_NAME_PATTERN})(:)(-?[\\d.]+(?:e-?\\d+)?)?\\))`,
  'gm'
)

const CHECK_REGEX = /^(\s*- )\[([x ])\]/

function getHashStyleRegex(tokenPrefix = DEFAULT_TOKEN_PREFIX, orderMeta = false) {
  return orderMeta ?
    new XRegExp(
      `${tokenPrefix}(${LIST_NAME_PATTERN})[ \\t]+(.+)$`, 'gm'
    ) :
    new XRegExp(
      `${tokenPrefix}(${LIST_NAME_PATTERN})(:(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$`,
      'gm'
    )
}

function getCheckedData(content) {
  const taskRegex = new RegExp(CHECK_REGEX)
  const result = taskRegex.exec(content)
  return result
    ? {
        pad: result[1].length,
        checked: result[2].trim() !== '',
      }
    : null
}

function getContentLines(content) {
  let foundContent = false
  return eol.split(content).filter((line) => {
    const hasContent = line.trim()
    if (!foundContent && hasContent) foundContent = true
    return foundContent || hasContent
  })
}

function isCustomCardTerminator(config, line) {
  return config.customCardTerminator 
    && config.customCardTerminator.trim() 
    && line 
    && line.trim() === config.customCardTerminator
}

function isCheckBoxTask (config, line, beforeText) {
  if (!config.isAddCheckBoxTasks()) return

  const beforeTextCheckData = getCheckedData(beforeText)
  if (!beforeTextCheckData) return

  const lineCheckData = getCheckedData(line)
  if (!lineCheckData) return

  return lineCheckData.pad <= beforeTextCheckData.pad
}

function hasTaskInText(config, text, isCodeFile) {
  return (
    (isCodeFile && hasCodeStyleTask(config, text)) ||
    ((new XRegExp(getHashStyleRegex(config.tokenPrefix)).test(text) ||
      new XRegExp(getHashStyleRegex(config.tokenPrefix, true)).test(text) ||
      new XRegExp(LINK_STYLE_REGEX).test(text)) &&
      config.lists.find((list) => text.includes(`${config.tokenPrefix}${list.name}`)))
  )
}

function isBeforeTextMarkdownList(beforeText) {
  return /^\s*(\*|-|- \[[x| ]\]|\d+\.|[a-zA-Z]\.)\s$/.test(beforeText)
}

function isMarkdownListItem(line) {
  return /^\s*(\*|-|- \[[x| ]\]|\d+\.|[a-zA-Z]\.)\s/.test(line)
}

function padDescription(description = [], beforeText = '') {
  if (!isBeforeTextMarkdownList(beforeText)) return description
  return description.map((line) => {
    return line.padStart(line.length + beforeText.length)
  })
}

function isLineOutsideMarkdownList(line, beforeText) {
  return isBeforeTextMarkdownList(beforeText) &&
    isMarkdownListItem(line) &&
    line.search(/\S/) <= beforeText.search(/\S/)
}

function hasCodeStyleTask(config, text) {
  let result = new RegExp(CODE_STYLE_PATTERN).exec(text)
  if (!result) return false
  return config.includeList(result[1])
}

function getCardTagsTaskContent ({
  content,
  fileType
}) {
  const isCodeFile = fileType === FILE_TYPES.CODE
  if (isCodeFile) return
  
  const isMarkDownFile = fileType === FILE_TYPES.MARKDOWN
  let lines = getContentLines(content)
  const hasCardStartTag =
    isMarkDownFile && lines.length > 1 && lines[1].trim() === START_TAG
  if (!hasCardStartTag) return

  let openBlockCommentTokens = 0
  let closeBlockCommentTokens = 0
  let hasCardEndTag = false
  const rawTaskContentLines = []
  const taskContentLines = []
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i]
    // Check for matching block comments in markdown files
    if (isMarkDownFile && line.trim().indexOf('<!--') > -1)
      openBlockCommentTokens++
    if (isMarkDownFile && line.trim().indexOf('-->') > -1)
      closeBlockCommentTokens++

    rawTaskContentLines.push(line)

    if (line.trim() === START_TAG) continue
    if (line.trim() === END_TAG) {
      hasCardEndTag = true
      break
    }
    taskContentLines.push(line)
  }

  // Remove extra block comment tokens
  if (
    isMarkDownFile &&
    rawTaskContentLines.length &&
    rawTaskContentLines[rawTaskContentLines.length - 1].trim() === '-->' &&
    openBlockCommentTokens !== closeBlockCommentTokens
  )
    rawTaskContentLines.pop()

  const isWrappedWithCardTag = hasCardStartTag && hasCardEndTag

  return {
    rawTaskContentLines,
    taskContentLines,
    isWrappedWithCardTag,
  }
}

// This finds the end of task
function getCodeFileTaskContent ({
  config,
  content,
  inBlockComment,
  fileType,
  lang
}) {
  const isCodeFile = fileType === FILE_TYPES.CODE
  if (!isCodeFile) return

  const rawTaskContentLines = []
  let lines = getContentLines(content)
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i]
    // Another task ends a task
    if (hasTaskInText(config, line, isCodeFile)) break
    if (
      !inBlockComment &&
      (line.indexOf(lang.symbol) < 0 ||
      line.trim().indexOf(lang.symbol) > 0 ||
      line.trim() === lang.symbol)
    )
      break
    if (lang.block && line.trim() === lang.block.end)
      break
    if (lang.block && line.trim() === lang.block.ignore)
      break
    if (line && lang && lang.block) line = line.replace(lang.block.end, '')
    
    rawTaskContentLines.push(line)
  }
  return {
    rawTaskContentLines,
    taskContentLines: rawTaskContentLines,
  }
}

function getTextFileTaskContent ({
  config,
  content,
  beforeText,
  fileType,
}) {
  const isCodeFile = fileType === FILE_TYPES.CODE
  if (isCodeFile) return

  let lines = getContentLines(content)
  const hasCardStartTag = lines.length > 1 && lines[1].trim() === START_TAG
  if (hasCardStartTag) return

  const isMarkDownFile = fileType === FILE_TYPES.MARKDOWN
  const isTaskInList = isMarkDownFile && isBeforeTextMarkdownList(beforeText)
  let openBlockCommentTokens = 0
  let closeBlockCommentTokens = 0
  let lastLineBlank = false
  let endsWithDoubleBlank = false
  let trailingBlankLines = 0
  const rawTaskContentLines = []
  const taskContentLines = []

  let inCodeBlock = false
  let inCodeSpan = false

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i]

    // Check for markdown code blocks
    if (isMarkDownFile && line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
    }

    // Check for markdown code spans
    if (isMarkDownFile && line.includes('`')) {
      const codeSpanMatches = line.match(/`+/g)
      if (codeSpanMatches && codeSpanMatches.length % 2 !== 0) {
        inCodeSpan = !inCodeSpan
      }
    }

    // Only break if the task is not in a markdown code block or code span
    if (!inCodeBlock && !inCodeSpan && hasTaskInText(config, line)) break
    if (isCheckBoxTask(config, line, beforeText)) break
    if (isTaskInList && isLineOutsideMarkdownList(line, beforeText)) break
    if (isCustomCardTerminator(config, line)) break
    
    rawTaskContentLines.push(line)
    taskContentLines.push(`${line}`)

    // Check for matching block comments in markdown files
    if (isMarkDownFile && line.trim().indexOf('<!--') > -1)
      openBlockCommentTokens++
    if (isMarkDownFile && line.trim().indexOf('-->') > -1)
      closeBlockCommentTokens++  

    const thisLineBlank = line.trim() === ''

    if (thisLineBlank && lastLineBlank) {
      endsWithDoubleBlank = true
      break
    }

    lastLineBlank = thisLineBlank  
  }

  if (endsWithDoubleBlank) trailingBlankLines = 2
  else if (lastLineBlank) trailingBlankLines = 1

  // Remove extra block comment tokens
  if (
    isMarkDownFile &&
    rawTaskContentLines.length &&
    rawTaskContentLines[rawTaskContentLines.length - 1].trim() === '-->' &&
    openBlockCommentTokens !== closeBlockCommentTokens
  ) {
    rawTaskContentLines.pop()
    taskContentLines.pop()
  }

  return {
    rawTaskContentLines,
    taskContentLines: trailingBlankLines 
      ? taskContentLines.slice(0, -trailingBlankLines)
      : taskContentLines,
    trailingBlankLines,
  }
}

function getTaskContent ({
  config,
  content,
  inBlockComment,
  beforeText,
  fileType,
  lang  
}) {
  return getCardTagsTaskContent({ content, fileType }) ||
    getCodeFileTaskContent({ config, content, inBlockComment, fileType, lang }) ||
    getTextFileTaskContent({ config, content, beforeText, fileType })
}

function getRawTask ({
  tokenPrefix = DEFAULT_TOKEN_PREFIX,
  orderMeta = true,
  beforeText = '',
  hasColon = false,
  list,
  order = '',
  text,
  type = TASK_TYPES.HASHTAG
}) {
  if (type === TASK_TYPES.MARKDOWN) {
    return `${beforeText || ''}[${text}](${tokenPrefix}${list}:${
      orderMeta ? '' : order
    })`
  } else {
    const colon = hasColon || (isNumber(order) && !orderMeta) ? ':' : '';
    return `${beforeText || ''}${tokenPrefix}${list}${colon}${
      orderMeta ? '' : order
    } ${text}`  
  } 
}

function isNumber (value) {
  return !isNaN(parseFloat(value)) && isFinite(value)
}

module.exports = {
  FILE_TYPES,
  TASK_TYPES,
  getTaskContent,
  getRawTask,
  isBeforeTextMarkdownList,
  padDescription,
  getCheckedData,
  hasTaskInText,
  isNumber,
  getHashStyleRegex,
  CHECK_REGEX,
  LIST_NAME_PATTERN,
  LINK_STYLE_REGEX
}