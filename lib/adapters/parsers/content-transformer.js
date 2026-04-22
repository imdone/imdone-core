import { Eta } from "eta"
import uniqid from 'uniqid';

function removeDisplayComments(description) {
  // State machine implementation to avoid catastrophic backtracking
  // Looking for pattern: <!-- [ content ] -->
  let result = '';
  const len = description.length;
  let i = 0;

  while (i < len) {
    // Check for HTML comment start: <!--
    if (i <= len - 4 &&
        description[i] === '<' &&
        description[i + 1] === '!' &&
        description[i + 2] === '-' &&
        description[i + 3] === '-') {

      const commentStart = i;
      i += 4; // Skip <!--

      // Skip whitespace
      while (i < len && /\s/.test(description[i])) {
        i++;
      }

      // Check for opening bracket
      if (i < len && description[i] === '[') {
        i++; // Skip [
        const contentStart = i;

        // Find closing bracket followed by optional whitespace and -->
        while (i < len) {
          if (description[i] === ']') {
            const contentEnd = i;
            i++; // Skip ]

            // Skip whitespace
            while (i < len && /\s/.test(description[i])) {
              i++;
            }

            // Check for comment end: -->
            if (i <= len - 3 &&
                description[i] === '-' &&
                description[i + 1] === '-' &&
                description[i + 2] === '>') {
              // Found complete pattern - extract content
              result += description.substring(contentStart, contentEnd);
              i += 3; // Skip -->
              break;
            }
          }
          i++;
        }

        // If we didn't find the complete pattern, include what we had
        if (i >= len) {
          result += description.substring(commentStart, i);
        }
        continue;
      }

      // No opening bracket after <!--, include the comment start and continue
      result += description.substring(commentStart, i);
      continue;
    }

    result += description[i];
    i++;
  }

  return result;
}

function escapeCodeBlocks(content, useRegex = false) {
  if (useRegex) {
    // Old regex-based implementation (can cause catastrophic backtracking)
    // Kept for testing/comparison purposes only
    return _escapeCodeBlocksRegex(content);
  }

  // New state machine implementation (safe from catastrophic backtracking)
  let codeBlocks = [];
  let result = '';
  const len = content.length;
  let i = 0;

  while (i < len) {
    // Check for code block (```)
    if (content[i] === '`' && content[i + 1] === '`' && content[i + 2] === '`') {
      const start = i;
      i += 3; // Skip opening ```

      // Find closing ```
      while (i < len - 2) {
        if (content[i] === '`' && content[i + 1] === '`' && content[i + 2] === '`') {
          i += 3; // Include closing ```
          const match = content.substring(start, i);
          const key = `__CODE_BLOCK_${codeBlocks.length}__`;
          codeBlocks.push(match);
          result += key;
          break;
        }
        i++;
      }
      // If we didn't find a closing ```, include what we have
      if (i >= len - 2 && content[i - 3] !== '`') {
        result += content.substring(start, i);
      }
      continue;
    }

    // Check for inline code (`)
    if (content[i] === '`') {
      const start = i;
      i++; // Skip opening `

      // Find closing `
      while (i < len) {
        if (content[i] === '`') {
          i++; // Include closing `
          const match = content.substring(start, i);
          const key = `__CODE_BLOCK_${codeBlocks.length}__`;
          codeBlocks.push(match);
          result += key;
          break;
        }
        i++;
      }
      // If we didn't find a closing `, include what we have
      if (i >= len && content[i - 1] !== '`') {
        result += content.substring(start, i);
      }
      continue;
    }

    result += content[i];
    i++;
  }

  return { content: result, codeBlocks };
}

function _escapeCodeBlocksRegex(content) {
  // OLD IMPLEMENTATION - DO NOT USE IN PRODUCTION
  // This regex can cause catastrophic backtracking with nested backticks
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
 * Interpolates the content with the provided data using state machine parsing.
 * @param {string} content - The content to interpolate.
 * @param {object} data - The data to use for interpolation.
 * @param {object} opts - The options for interpolation.
 * @returns {object} - The interpolated content, whether there was interpolation, and error tokens.
 */
export function interpolate(content, data, opts = { tags: ['${', '}'] }) {
  const errorTokens = {};
  const { tags } = opts;
  const [startTag, endTag] = tags;
  let hasInterpolation = false;

  // State machine implementation to avoid catastrophic backtracking
  let result = '';
  const len = content.length;
  let i = 0;

  while (i < len) {
    // Check if we're at a potential start tag
    // Skip if preceded by backtick or backslash
    const prevChar = i > 0 ? content[i - 1] : '';
    const isEscaped = prevChar === '`' || prevChar === '\\';

    // Check for start tag match
    let startTagMatches = !isEscaped && true;
    for (let j = 0; j < startTag.length && startTagMatches; j++) {
      if (i + j >= len || content[i + j] !== startTag[j]) {
        startTagMatches = false;
      }
    }

    if (startTagMatches) {
      // Found start tag - look for matching end tag
      const matchStart = i;
      i += startTag.length;
      const contentStart = i;

      // Find the end tag
      let foundEnd = false;
      while (i < len) {
        let endTagMatches = true;
        for (let j = 0; j < endTag.length && endTagMatches; j++) {
          if (i + j >= len || content[i + j] !== endTag[j]) {
            endTagMatches = false;
          }
        }

        if (endTagMatches) {
          // Found end tag
          const templateContent = content.substring(contentStart, i);
          i += endTag.length;
          foundEnd = true;

          // Try to interpolate
          try {
            const eta = new Eta({ tags, useWith: true, autoEscape: false });
            const template = `${startTag}= ${templateContent} ${endTag}`;
            const interpolated = eta.renderString(template, data);
            result += interpolated || '';
            hasInterpolation = true;
          } catch (e) {
            // On error, preserve the original match with an error token
            const token = `__ERROR_TOKEN_${uniqid()}__`;
            const originalMatch = content.substring(matchStart, i);
            errorTokens[token] = originalMatch;
            result += token;
          }
          break;
        }
        i++;
      }

      // If no end tag found, include the start tag and continue
      if (!foundEnd) {
        result += content.substring(matchStart, i);
      }
      continue;
    }

    result += content[i];
    i++;
  }

  return { content: result, hasInterpolation, errorTokens };
}

export function encodeMarkdownLinks(content) {
  return content.replace(/(?<!!)\[(.*?)\]\((.*?)( ".*?")?\)/g, (_match, p1, p2, p3) => {
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
