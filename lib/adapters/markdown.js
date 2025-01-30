const checkbox = require('markdown-it-checkbox')
const imageSize = require('markdown-it-imsize')
const emoji = require('markdown-it-emoji')
const mark = require('markdown-it-mark')
const removeMD = require('remove-markdown')
const wikilinks = require('@kwvanderlinde/markdown-it-wikilinks')
const path = require('path');

const MarkdownIt = require('markdown-it')
let _platform = process.platform

function extractWikilinkTopics(markdown) {
  const wikilinkRegex = /\[\[([\w\s/]+)(\|([\w\s/]+))?\]\]/g; // Match [[Topic]] or [[Topic|Display Text]]
  const topics = [];
  let match;

  // Use RegExp.exec to iterate through all matches
  while ((match = wikilinkRegex.exec(markdown)) !== null) {
    topics.push(match[1].trim()); // Extract the topic (first capture group) and trim whitespace
  }

  return topics;
}

function getRenderer(filePath) {
  const md = new MarkdownIt({html: true, breaks: true})

  md.use(checkbox)
  .use(mark)
  .use(emoji)
  .use(imageSize)
  .use(wikilinks(
    { 
      linkPattern: /\[\[([\w\u00C0-\u017F\s\d-/]+)(\|([\w\u00C0-\u017F\s\d-/]+))?\]\]/,
      uriSuffix: '.md',
      postProcessPageName (pagename) {
        return pagename.trim()
      }
    }
  ))
  .use(replaceImagePaths(filePath))
  .use(replaceLinkPaths(filePath))
  .validateLink = () => true

  return md
}

function replaceImagePaths(filePath) {

  return function(md) {
    const defaultRender = md.renderer.rules.image || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.image = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      const dirname = _platform === 'win32' ? path.win32.dirname : path.dirname;
      const resolve = _platform === 'win32' ? path.win32.resolve : path.resolve;
      if (srcIndex >= 0) {
        const src = token.attrs[srcIndex][1];
        if (!src.startsWith('http')) {
          const srcDir = dirname(filePath);
          const srcPath = resolve(srcDir, src) // filePath ? path.join(filePath, src) : path.resolve(src);
          const srcUrl = pathToFileURL(srcPath);
          token.attrs[srcIndex][1] = srcUrl;
        }
      }

      return defaultRender(tokens, idx, options, env, self);
    };
  }
}

function replaceLinkPaths(filePath) {

  return function(md) {
    const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('href');
      const dirname = _platform === 'win32' ? path.win32.dirname : path.dirname;
      const resolve = _platform === 'win32' ? path.win32.resolve : path.resolve;
      if (srcIndex >= 0) {
        const src = token.attrs[srcIndex][1];
        if (!src.startsWith('http')) {
          const srcDir = dirname(filePath);
          const srcPath = resolve(srcDir, src) // filePath ? path.join(filePath, src) : path.resolve(src);
          const srcUrl = pathToFileURL(srcPath);
          token.attrs[srcIndex][1] = srcUrl;
        }
      }

      return defaultRender(tokens, idx, options, env, self);
    };
  }
}

function pathToFileURL(absolutePath) {
  if (_platform === 'win32') {
    absolutePath = '/' + absolutePath.replace(/\\/g, '/');
  }
  return `file://${absolutePath}`;
}

function renderCancelledTasks(markdown) {
  return markdown.replace(/- \[-\] (.+)/gm, '- :no_entry_sign: ~~$1~~');
}

module.exports = {
  _setPlatform(platform) {
    _platform = platform
  },
  renderMarkdown (markdown, filePath) {
    markdown = renderCancelledTasks(markdown)
    return getRenderer(filePath).render(markdown)
  },
  extractWikilinkTopics,
  removeMD  
}
