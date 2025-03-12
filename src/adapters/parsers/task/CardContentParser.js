import eol from 'eol'
import XRegExp from 'xregexp'

export const FILE_TYPES = {
  MARKDOWN: 'markdown',
  CODE: 'code',
}
export const TASK_TYPES = {
  CODE: 'CODE',
  HASHTAG: 'HASHTAG',
  MARKDOWN: 'MARKDOWN',
}

const DEFAULT_TOKEN_PREFIX = '#'
const START_TAG = '<card>'
const END_TAG = '</card>'
const CODE_STYLE_PATTERN = '([A-Z]+[A-Z-_]+?)((:)(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$'

export const LIST_NAME_PATTERN = '[\\p{L}0-9-_]{2,}' // [a-zA-Z-_]+?
export const LINK_STYLE_REGEX = new XRegExp(
  `(\\[.*\\]\\s?)?(\\[(.+)\\]\\(#(${LIST_NAME_PATTERN})(:)(-?[\\d.]+(?:e-?\\d+)?)?\\))`,
  'gm'
)

export const CHECK_REGEX = /^(\s*- )\[([x ])\]/

export function getHashStyleRegex(tokenPrefix = DEFAULT_TOKEN_PREFIX, orderMeta = false) {
  return orderMeta ?
    new XRegExp(
      `${tokenPrefix}(${LIST_NAME_PATTERN})[ \\t]+(.+)$`, 'gm'
    ) :
    new XRegExp(
      `${tokenPrefix}(${LIST_NAME_PATTERN})(:(-?[\\d.]+(?:e-?\\d+)?)?)?[ \\t]+(.+)$`,
      'gm'
    )
}

export function getCheckedData(content) {
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

export function hasTaskInText(config, text, isCodeFile) {
  const hashStyleRegex = new XRegExp(getHashStyleRegex(config.tokenPrefix));
  const linkStyleRegex = new XRegExp(LINK_STYLE_REGEX);

  const inlineCodeRe = /`[^`]*`/g;

  // Function to check if a match is within inline code
  function isWithinInlineCode(index) {
    let match;
    while ((match = inlineCodeRe.exec(text)) !== null) {
      const isInCode = index >= match.index && index < match.index + match[0].length
      if (isInCode) return true;
    }
    return false;
  }

  // Check for code style tasks
  if (isCodeFile && hasCodeStyleTask(config, text)) {
    return true;
  }

  // Check for hash style tasks
  let result;
  if ((result = hashStyleRegex.exec(text)) !== null && !isWithinInlineCode(result.index)) {
    return !!config.lists.find((list) => text.includes(`${config.tokenPrefix}${list.name}`));
  }

  // Check for link style tasks
  if ((result = linkStyleRegex.exec(text)) !== null && !isWithinInlineCode(result.index)) {
    return !!config.lists.find((list) => text.includes(`${config.tokenPrefix}${list.name}`));
  }

  return false;
}

export function isBeforeTextMarkdownList(beforeText) {
  return /^\s*(\*|-|- \[[x| ]\]|\d+\.|[a-zA-Z]\.)\s$/.test(beforeText)
}

function isMarkdownListItem(line) {
  return /^\s*(\*|-|- \[[x| ]\]|\d+\.|[a-zA-Z]\.)\s/.test(line)
}

export function padDescription(description = [], beforeText = '') {
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
  const codeStylePatternRe = new RegExp(CODE_STYLE_PATTERN);
  let result = codeStylePatternRe.exec(text);

  if (!result) return false;

  // Check if the match is within inline code
  const inlineCodeRe = /`[^`]*`/g;
  let match;
  while ((match = inlineCodeRe.exec(text)) !== null) {
    if (result.index >= match.index && result.index < match.index + match[0].length) {
      return false;
    }
  }

  return config.includeList(result[1]);
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

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i]

    // Check for markdown code blocks
    if (isMarkDownFile && line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
    }

    // Only break if the task is not in a markdown code block or code span
    if (!inCodeBlock && hasTaskInText(config, line)) break
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

export function getTaskContent ({
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

export function getRawTask ({
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

export function isNumber (value) {
  return !isNaN(parseFloat(value)) && isFinite(value)
}
