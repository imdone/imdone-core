const path = require('path')
const ReadStreamTaskParser = require('./ReadStreamTaskParser')
const CodeStyleTaskParser = require('../task/CodeStyleTaskParser')
const languages = require('../../../languages')
const extractComments = require('multilang-extract-comments')
const eol = require('eol')
const { Readable } = require('stream')

module.exports = class ReadStreamCodeParser extends ReadStreamTaskParser {
  constructor(readStream, filePath, lang, lists) {
    super(readStream)
    this.lists = lists
    this.filePath = filePath
    this.lang = lang
    this.taskParsers = [new CodeStyleTaskParser()]
  }

  async init() {
    const code = await streamToString(this.readStream)
    // TODO Getting tokens from lists should be done higher up in the controller
    // <!--
    // order:-10
    // -->
    const tokens = this.lists.filter(list => !list.filter).map(list => list.name)
    this.cards = this.parseCards(code, tokens)
  }

  async readTask() {
    return this.cards.shift()
  }

  parseCards(code, tokens = ['TODO']) {
    const comments = this.parseComments(code);
    const cards = [];
  
    Object.keys(comments).forEach((comment) => {
      const { begin, end, content } = comments[comment];
      const line = begin;
      const lastLine = end; // TODO lastLine should not be - 1
                            // <!--
                            // order:-140
                            // -->
      const lines = content.split('\n');
  
      // Check if the comment contains "TODO"
      lines.forEach(codeLine => {
        if (tokens.find((token) => codeLine.includes(token))) {
          // Get all lines from start to end
          
          cards.push({
            content,
            line,
            lastLine,
          });
        }
      });
    });
    return cards;
  }
  
  parseComments(code) {
    const options = getLanguageOptions(this.filePath);
    const comments = extractComments(code, options);
    return comments;
  }
  
}


function getLanguageOptions(filePath) {
  const extension = path.extname(filePath)
  const language = languages[extension]
  
  
  const {
      name,
      symbol,
      block,
    } = language || 
    { 
      name: 'text', 
      symbol: '', 
      block: {
        start: undefined,
        end: undefined,
        ignore: undefined,
      }
    };
  // Use lang to get comment patterns

  const {
    start,
    ignore: middle,
    end
  } = block || {};
  
  return language && {
    pattern: {
      name,
      nameMatchers: extension && [extension] || [],
      singleLineComment: symbol && [{ start: symbol }] || [],
      multiLineComment: start && end && [{ start, middle, end }] || [],
    },
  };
}

async function streamToString(stream) {
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf-8')
}

function stringToStream(string) {
  const lines = eol.split(string).map((line) => line + String(eol.auto))
  return Readable.from(lines)
}
