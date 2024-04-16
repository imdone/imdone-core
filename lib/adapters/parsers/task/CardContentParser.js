const eol = require('eol')
const Task = require('../../../task')
const XRegExp = require('xregexp')

const FILE_TYPES = {
  MARKDOWN: 'markdown',
  CODE: 'code',
}

const START_TAG = '<card>'
const END_TAG = '</card>'
const CODE_BLOCK_REGEX =  /`{3}[\s\S]*?`{3}/gm
const INLINE_CODE_REGEX = /`[\s\S]*?`/g
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
const CHECK_STYLE_REGEX = /^(\s*- \[([x ])\]\s)(.+$)/gm

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

module.exports = {
  getContentLines,
  hasTaskInText,
  isCheckBoxTask,
  START_TAG,
  END_TAG,
  LIST_NAME_PATTERN,
  HASH_STYLE_REGEX,
  HASH_STYLE_META_ORDER_REGEX,
  LINK_STYLE_REGEX
}