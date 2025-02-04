const checkbox = require('markdown-it-checkbox')
const imageSize = require('markdown-it-imsize')
const emoji = require('markdown-it-emoji')
const mark = require('markdown-it-mark')
const removeMD = require('remove-markdown')
const path = require('path');

const MarkdownIt = require('markdown-it')
let _platform = process.platform

function extractWikilinkTopics(markdown) {
  const wikilinkRegex = /\[\[([a-zA-Z0-9\u00C0-\u017F/_\-. ]+)(?:\|([^\]]+))?\]\]/g;
  const topics = [];
  let match;

  while ((match = wikilinkRegex.exec(markdown)) !== null) {
    topics.push(match[1].trim()); // Always extract the topic (first capture group)
  }

  return topics;
}

function getRenderer(filePath) {
  const md = new MarkdownIt({html: true, breaks: true})

  md.use(checkbox)
  .use(mark)
  .use(emoji)
  .use(imageSize)
  .use(obsidianTopicLinks(filePath))
  .use(replaceImagePaths(filePath))
  .use(replaceLinkPathsAndTitles(filePath))
  .validateLink = () => true

  return md
}

function obsidianTopicLinks(filePath) {
  return function(md) {
    const obsidianLinkRegex = /^\[\[([a-zA-Z0-9\u00C0-\u017F/_\-. ]+)(?:\|([^\]]+))?\]\]/; // No 'g' flag

    function obsidianLinkRenderer(state, silent) {
      const pos = state.pos;
      const match = state.src.slice(pos).match(obsidianLinkRegex); // Always start from `pos`

      if (!match) return false;
      if (silent) return true; // Don't process further in silent mode

      const fullMatch = match[0];
      let topic = match[1].trim();
      const alias = match[2] ? match[2].trim() : topic;
      if (!topic.endsWith('.md')) topic = `${topic}.md`;
      const unencodedHref = resolveFileUrl(topic, filePath);
      const href = encodeURI(unencodedHref);

      // Create a new token
      const token = state.push("obsidian_link", "", 0);
      token.content = `<a href="${href}" title="${unencodedHref}">${md.utils.escapeHtml(alias)}</a>`;

      // Move parsing position forward
      state.pos += fullMatch.length;
      return true;
    }

    function render(tokens, idx) {
      return tokens[idx].content;
    }

    md.inline.ruler.before("link", "obsidian_link", obsidianLinkRenderer);
    md.renderer.rules.obsidian_link = render;
  }
}


function replaceImagePaths(filePath) {

  return function(md) {
    const defaultRender = md.renderer.rules.image || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.image = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      if (srcIndex >= 0) {
        const src = token.attrs[srcIndex][1];
        const srcUrl = !isUrl(src) && resolveFileUrl(src, filePath)
        if (srcUrl) token.attrs[srcIndex][1] = srcUrl;
      }

      return defaultRender(tokens, idx, options, env, self);
    };
  }
}

function replaceLinkPathsAndTitles(filePath) {

  return function(md) {
    const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('href');
      if (srcIndex >= 0) {
        const src = token.attrs[srcIndex][1];
        const srcUrl = !isUrl(src) && resolveFileUrl(src, filePath)
        if (srcUrl) token.attrs[srcIndex][1] = srcUrl;
      }

      // set the title to the href if it's not already set
      const titleIndex = token.attrIndex('title');
      if (titleIndex < 0) {
        const title = token.attrs[srcIndex][1];
        token.attrPush(['title', title]);
      }
      return defaultRender(tokens, idx, options, env, self);
    };
  }
}

function isUrl(href) {
  try {
    new URL(href);
    return true;
  } catch (e) {
    return false;
  }
}

function resolveFileUrl(src, filePath) {
  const dirname = _platform === 'win32' ? path.win32.dirname : path.dirname;
  const resolve = _platform === 'win32' ? path.win32.resolve : path.resolve;

  if (src.startsWith('file://')) return src;
  if (/^\.?\/$/.test(src)) src = './';
  const srcDir = dirname(filePath);
  const srcPath = resolve(srcDir, src) // filePath ? path.join(filePath, src) : path.resolve(src);
  const srcUrl = pathToFileURL(srcPath);

  return srcUrl;

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
