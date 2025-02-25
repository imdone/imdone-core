const template = require('lodash.template')
const uniqid = require('uniqid');

module.exports = {
  format,
  encodeMarkdownLinks
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

/**
 * Interpolates the content with the provided data.
 * @param {string} content - The content to interpolate.
 * @param {object} data - The data to use for interpolation.
 * @param {object} opts - The options for interpolation.
 * @returns {object} - The interpolated content, whether there was interpolation, and error tokens.
 */
function interpolate(content, data, opts) {
  const errorTokens = {};
  let hasInterpolation = false;

  content = content.replace(opts.interpolate, (match, p1) => {
    try {
      const result = template(match, opts)(data);
      if (result !== match) {
        hasInterpolation = true;
      }
      return result;
    } catch (e) {
      const token = `__ERROR_TOKEN_${uniqid()}__`;
      errorTokens[token] = match;
      return token;
    }
  });

  return { content, hasInterpolation, errorTokens };
}

function encodeMarkdownLinks(content) {
  return content.replace(/(?<!!)\[(.*?)\]\((.*?)( ".*?")?\)/g, (match, p1, p2, p3) => {
    // URI encode file links
    const title = p3 || '';
    const encodedUrl = p2.replace(/\s/g, '%20').replace(/\)/g, '%29').replace(/\(/g, '%28');
    const link = `[${p1}](${encodedUrl}${title})`;
    return link.replace(/%20(".*?"\))$/, ' $1');
  });
}

function format(content, data, mustache) {
  const opts = { interpolate: /(?<![`\\])\${([\s\S]+?)}/g };
  const errorTokens = {};

  if (mustache) content = removeDisplayComments(content);

  // Escape code blocks before processing interpolation
  const { content: escapedContent, codeBlocks } = escapeCodeBlocks(content);

  let result = escapedContent;
  let hasInterpolation = true;

  while (hasInterpolation) {
    const interpolationResult = interpolate(result, data, opts);
    result = interpolationResult.content;
    hasInterpolation = interpolationResult.hasInterpolation;
    Object.assign(errorTokens, interpolationResult.errorTokens);
  }

  if (mustache) {
    const mustacheOpts = { interpolate: /(?<!`){{([\s\S]+?)}}/g };
    hasInterpolation = true;
    while (hasInterpolation) {
      const interpolationResult = interpolate(result, data, mustacheOpts);
      result = interpolationResult.content;
      hasInterpolation = interpolationResult.hasInterpolation;
      Object.assign(errorTokens, interpolationResult.errorTokens);
    }
  }

  result = restoreCodeBlocks(result, codeBlocks);

  // Restore error tokens
  Object.keys(errorTokens).forEach(token => {
    result = result.replace(new RegExp(token, 'g'), errorTokens[token]);
  });

  return result;
}
