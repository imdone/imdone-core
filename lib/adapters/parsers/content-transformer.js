const template = require('lodash.template')

module.exports = {
  format,
}

function removeDisplayComments(description) {
  return description.replace(/<!--\s*\[([\s\S]*?)\]\s*-->/g, '$1')
}

function escapeCodeBlocks(content) {
  const codeBlockRegex = /(```[\s\S]*?```|`[^`]*`)/g
  let codeBlocks = []
  
  // Replace code blocks with unique keys
  content = content.replace(codeBlockRegex, (match) => {
    const key = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(match) // Maintain order
    return key
  })

  return { content, codeBlocks }
}

function restoreCodeBlocks(content, codeBlocks) {
  // Restore code blocks in order using stored array
  codeBlocks.forEach((code, index) => {
    content = content.replace(`__CODE_BLOCK_${index}__`, code)
  })
  return content
}

function format(content, data, mustache) {
  const opts = { interpolate: /(?<![`\\])\${([\s\S]+?)}/g }

  if (mustache) content = removeDisplayComments(content)

  // Escape code blocks before processing interpolation
  const { content: escapedContent, codeBlocks } = escapeCodeBlocks(content)

  try {
    content = template(escapedContent, opts)(data)
  } catch (e) {
    console.error(e)
  }

  if (mustache) {
    const opts = { interpolate: /(?<!`){{([\s\S]+?)}}/g }
    try {
      content = template(content, opts)(data)
    } catch (e) {
      console.error(e)
      content = content.replace(opts.interpolate, `~~{{${e}}}~~`)
    }
  }

  content = restoreCodeBlocks(content, codeBlocks)

  return content
}
