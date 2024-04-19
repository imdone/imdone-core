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
            line.trim().indexOf(lang.symbol) > 0)) ||
        line.trim() === lang.symbol
      )
        break
      if (isCodeFile && lang.block && line.trim() === lang.block.end)
        break
      if (isCodeFile && lang.block && line.trim() === lang.block.ignore)
        break
      if (!isCodeFile && line.trim() === '') break
    }
    if (hasTaskInText(config, line, isCodeFile)) break

    if (line && lang.block) line = line.replace(lang.block.end, '')

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
    rawDescription: commentLines,
    isWrappedWithCardTag: hasCardStartTag && hasCardEndTag
  }
}

module.exports = {
  FILE_TYPES,
  getTaskContent,
  START_TAG,
  END_TAG,
  LIST_NAME_PATTERN,
  HASH_STYLE_REGEX,
  HASH_STYLE_META_ORDER_REGEX,
  LINK_STYLE_REGEX
}