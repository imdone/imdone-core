const TaskParser = require('./TaskParser')

module.exports = class HashStyleTaskParser extends TaskParser {
  constructor() {
    super('HASHTAG')
  }

  get pattern() {
    return /^(.*?)#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm
  }

  parse(lineContent, line, matchResult) {
    const [match, beforeText, list, colon, order, text] = matchResult
    return {
      beforeText,
      text,
      order,
      list,
      line,
      colon,
      type: this.type,
    }
  }
}
