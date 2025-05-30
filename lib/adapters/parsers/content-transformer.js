import { Eta } from "eta"
import uniqid from 'uniqid';

function removeDisplayComments(description) {
  return description.replace(/<!--\s*\[([\s\S]*?)\]\s*-->/g, '$1');
}

function escapeCodeBlocks(content) {
  const codeBlockRegex = /(```[\s\S]*?```|`[^`]*`)/g;
  let codeBlocks = [];

  // Replace code blocks with unique keys
  content = content.replace(codeBlockRegex, (match) => {
    const key = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match); // Maintain order
    return key;
  });

  return { content, codeBlocks };
}

function restoreCodeBlocks(content, codeBlocks) {
  // Restore code blocks in order using stored array
  codeBlocks.forEach((code, index) => {
    content = content.replace(`__CODE_BLOCK_${index}__`, code);
  });
  return content;
}

/**
 * Interpolates the content with the provided data.
 * @param {string} content - The content to interpolate.
 * @param {object} data - The data to use for interpolation.
 * @param {object} opts - The options for interpolation.
 * @returns {object} - The interpolated content, whether there was interpolation, and error tokens.
 */
export function interpolate(content, data, opts = { tags: ['${', '}'] }) {
  const errorTokens = {};
  const { tags } = opts;
  // /(?<![`\\])\${([\s\S]+?)}/g
  const regex = new RegExp(`(?<![\`\\\\])\\${tags[0]}([\\s\\S]+?)${tags[1]}`, 'g');
  let hasInterpolation = false;

  content = content.replace(regex, (match, p1) => {
    try {
      const eta = new Eta({ tags, useWith: true, autoEscape: false });
      const [startTag, endTag] = opts.tags;
      const template = `${startTag}= ${p1} ${endTag}`;
      const result = eta.renderString(template, data);
      if (result !== match) {
        hasInterpolation = true;
      }
      return result || '';
    } catch (e) {
      const token = `__ERROR_TOKEN_${uniqid()}__`;
      errorTokens[token] = match;
      return token || '';
    }
  });

  return { content, hasInterpolation, errorTokens };
}

export function encodeMarkdownLinks(content) {
  return content.replace(/(?<!!)\[(.*?)\]\((.*?)( ".*?")?\)/g, (match, p1, p2, p3) => {
    // URI encode file links
    const title = p3 || '';
    const encodedUrl = p2.replace(/\s/g, '%20').replace(/\)/g, '%29').replace(/\(/g, '%28');
    const link = `[${p1}](${encodedUrl}${title})`;

    // If there is more than one space in the URL, assume there's no title
    if ((p2.match(/\s/g) || []).length > 1) {
      return `[${p1}](${encodedUrl})`;
    }

    return link.replace(/%20(".*?"\))$/, ' $1');
  });
}

export function format(content, data, mustache) {
  const errorTokens = {};

  if (mustache) content = removeDisplayComments(content);

  // Escape code blocks before processing interpolation
  const { content: escapedContent, codeBlocks } = escapeCodeBlocks(content);

  let result = escapedContent;
  let hasInterpolation = true;

  while (hasInterpolation) {
    const interpolationResult = interpolate(result, data, { tags: ['${', '}'] });
    result = interpolationResult.content;
    hasInterpolation = interpolationResult.hasInterpolation;
    Object.assign(errorTokens, interpolationResult.errorTokens);
  }

  if (mustache) {
    hasInterpolation = true;
    while (hasInterpolation) {
      const interpolationResult = interpolate(result, data, { tags: ['{{', '}}'] });
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
