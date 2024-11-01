const TaskParser = require('./TaskParser')

module.exports = class CodeStyleTaskParser extends TaskParser {
  constructor(config) {
    super('CODE', config)
  }

  get pattern() {
    return /^(.*?[ #]?)([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm
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
