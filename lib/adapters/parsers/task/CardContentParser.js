const eol = require('eol')
const Task = require('../../../task')
const XRegExp = require('xregexp')

const FILE_TYPES = {
  MARKDOWN: 'markdown',
  CODE: 'code',
}

const START_TAG = '<card>'
const END_TAG = '</card>'
const CODE_STYLE_PATTERN = '([A-Z]+[A-Z-_]+?)((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$'
const LIST_NAME_PATTERN = '[\\p{L}0-9-_]{2,}' // [a-zA-Z-_]+?
const HASH_STYLE_REGEX = new XRegExp(
  `#(${LIST_NAME_PATTERN})(:(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$`,
  'gm'
)
const HASH_STYLE_META_ORDER_REGEX = new XRegExp(
  `#(${LIST_NAME_PATTERN})[ \\t]+(.+)$`, 'gm'
)
const LINK_STYLE_REGEX = new XRegExp(
  `(\\[.*\\]\\s?)?(\\[(.+)\\]\\(#(${LIST_NAME_PATTERN})(:)(-?[\\d.]+(?:e-?\\d+)?)?\\))`,
  'gm'
)

function getContentLines(content) {
  let foundContent = false
  return eol.split(content).filter((line) => {
    const hasContent = line.trim()
    if (!foundContent && hasContent) foundContent = true
    return foundContent || hasContent
  })
}

function isCheckBoxTask (config, line, beforeText) {
  if (!config.isAddCheckBoxTasks()) return

  const beforeTextCheckData = Task.getCheckedData(beforeText)
  if (!beforeTextCheckData) return

  const lineCheckData = Task.getCheckedData(line)
  if (!lineCheckData) return

  return lineCheckData.pad <= beforeTextCheckData.pad
}

function hasTaskInText(config, text, isCodeFile) {
  return (
    (isCodeFile && hasCodeStyleTask(config, text)) ||
    ((new XRegExp(HASH_STYLE_REGEX).test(text) ||
      new XRegExp(HASH_STYLE_META_ORDER_REGEX).test(text) ||
      new XRegExp(LINK_STYLE_REGEX).test(text)) &&
      config.lists.find((list) => text.includes(`#${list.name}`)))
  )
}

function hasCodeStyleTask (config, text) {
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
  let openBlockCommentTokens = 0
  let closeBlockCommentTokens = 0
  let lastLineBlank = false
  let endsWithDoubleBlank = false
  const rawTaskContentLines = []

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i]
    // Check for end of task
    // Another task ends a task
    if (hasTaskInText(config, line, isCodeFile)) break
    if (isCheckBoxTask(config, line, beforeText)) break

    // TODO Break this out into a function with an accurate name
    // Must have something to do with tasks in markdown lists
    if (
      isMarkDownFile &&
      beforeText &&
      /^\s*(\*|-|\d+\.|[a-zA-Z]\.)\s$/.test(beforeText) &&
      line.search(/\S/) <= beforeText.search(/\S/)
    ) break

    rawTaskContentLines.push(line)

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

  // Remove extra block comment tokens
  if (
    isMarkDownFile &&
    rawTaskContentLines.length &&
    rawTaskContentLines[rawTaskContentLines.length - 1].trim() === '-->' &&
    openBlockCommentTokens !== closeBlockCommentTokens
  )
    rawTaskContentLines.pop()

  const taskContentLines = endsWithDoubleBlank ? rawTaskContentLines.slice(0, -2) : rawTaskContentLines

  return {
    rawTaskContentLines,
    taskContentLines
  }
}

function getTaskContentNew ({
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

function getTaskContent ({
  config,
  content,
  inBlockComment,
  beforeText,
  fileType,
  lang  
}) {
  const isMarkDownFile = fileType === FILE_TYPES.MARKDOWN
  const isCodeFile = fileType === FILE_TYPES.CODE
  let openBlockCommentTokens = 0
  let closeBlockCommentTokens = 0
  let hasCardEndTag = false
  const commentLines = []
  let lines = getContentLines(content)
  const hasCardStartTag =
    isMarkDownFile && lines.length > 1 && lines[1].trim() === START_TAG
  for (let i = hasCardStartTag ? 2 : 1; i < lines.length; i++) {
    let line = lines[i]
    // Check for end of task
    // DOING: Make each of these a function for clarity
    if (isCheckBoxTask(config, line, beforeText) && !hasCardStartTag)
      break
    // Check for block comments in markdown files
    if (isMarkDownFile && line.trim().indexOf('<!--') > -1)
      openBlockCommentTokens++
    if (isMarkDownFile && line.trim().indexOf('-->') > -1)
      closeBlockCommentTokens++

    if (hasCardStartTag) {
      if (line.trim() === END_TAG) {
        hasCardEndTag = true
        break
      }
    } else {
      if (
        isMarkDownFile &&
        beforeText &&
        /^\s*(\*|-|\d+\.|[a-zA-Z]\.)\s$/.test(beforeText) &&
        line.search(/\S/) <= beforeText.search(/\S/)
      )
        break
      if (
        (isCodeFile &&
          !inBlockComment &&
          (line.indexOf(lang.symbol) < 0 ||
          line.trim().indexOf(lang.symbol) > 0 ||
          line.trim() === lang.symbol)
        )
      )
        break
      if (isCodeFile && lang.block && line.trim() === lang.block.end)
        break
      if (isCodeFile && lang.block && line.trim() === lang.block.ignore)
        break
      // A single blank line ends a task in a non-code file
      if (!isCodeFile && line.trim() === '') break
      // Another task ends a task
      if (hasTaskInText(config, line, isCodeFile)) break
    }

    if (line && lang && lang.block) line = line.replace(lang.block.end, '')

    if (hasCardStartTag || line.trim() !== '') commentLines.push(line)
  }

  // Remove extra block comment tokens
  if (
    isMarkDownFile &&
    commentLines.length &&
    commentLines[commentLines.length - 1].trim() === '-->' &&
    openBlockCommentTokens !== closeBlockCommentTokens
  )
    commentLines.pop()
  return {
    rawTaskContentLines: commentLines,
    isWrappedWithCardTag: hasCardStartTag && hasCardEndTag
  }
}

module.exports = {
  FILE_TYPES,
  getTaskContent,
  getTaskContentNew,
  START_TAG,
  END_TAG,
  LIST_NAME_PATTERN,
  HASH_STYLE_REGEX,
  HASH_STYLE_META_ORDER_REGEX,
  LINK_STYLE_REGEX
}