const TaskParser = require('./TaskParser')

module.exports = class HashStyleTaskParser extends TaskParser {
  constructor() {
    super('HASHTAG')
  }

  get pattern() {
    return /#([a-zA-Z-_]+?):(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm
  }

  parse(lineContent, line, matchResult) {
    const [match, list, order, junk, text] = matchResult
    return {
      text,
      order,
      list,
      line,
    }
  }
}
