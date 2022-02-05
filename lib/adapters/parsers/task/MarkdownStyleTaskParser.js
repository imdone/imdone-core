const TaskParser = require("./TaskParser");

module.exports = class MarkdownStyleTaskParser extends TaskParser {

  constructor () {
    super("MARKDOWN")
  }

  get pattern () {
    return /(\[.*\]\s?)?(\[(.+)\]\(#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?\))/gm
  }

  parse (lineContent, line, result) {
    const [match, before, rawTask, text, list, colon, order] = result
    return {
      text,
      order,
      list,
      line
    }
  }
}