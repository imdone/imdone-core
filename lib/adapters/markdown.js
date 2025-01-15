const checkbox = require('markdown-it-checkbox')
const imageSize = require('markdown-it-imsize')
const emoji = require('markdown-it-emoji')
const mark = require('markdown-it-mark')
const removeMD = require('remove-markdown')
const wikilinks = require('@kwvanderlinde/markdown-it-wikilinks')
const path = require('path');

const MarkdownIt = require('markdown-it')
let _platform = process.platform

function getRenderer(projectPath) {
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
  .use(replaceImagePaths(projectPath))
  .validateLink = () => true

  return md
}

function replaceImagePaths(projectPath) {

  return function(md) {
    const defaultRender = md.renderer.rules.image || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.image = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');

      if (srcIndex >= 0) {
        const src = token.attrs[srcIndex][1];
        if (!src.startsWith('http')) {
          const filePath = projectPath ? path.join(projectPath, src) : path.resolve(src);
          const fileUrl = pathToFileURL(filePath);
          token.attrs[srcIndex][1] = fileUrl;
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
  renderMarkdown (markdown, projectPath) {
    const md = getRenderer()
    markdown = renderCancelledTasks(markdown)
    return getRenderer(projectPath).render(markdown)
  },
  removeMD  
}
