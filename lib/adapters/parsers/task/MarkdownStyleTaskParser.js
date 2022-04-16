const TaskParser = require('./TaskParser')

module.exports = class MarkdownStyleTaskParser extends TaskParser {
  constructor() {
    super('MARKDOWN')
  }

  get pattern() {
    return /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?\))/gm
  }

  parse(lineContent, line, matchResult) {
    const [match, before, rawTask, text, list, colon, order] = matchResult
    return {
      text,
      order,
      list,
      line,
    }
  }
}
