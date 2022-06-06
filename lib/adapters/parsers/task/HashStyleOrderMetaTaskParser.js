const TaskParser = require('./TaskParser')

module.exports = class HashStyleOrderMetaTaskParser extends TaskParser {
  constructor() {
    super('HASH_META_ORDER')
  }

  get pattern() {
    return /^(.*?)#([a-zA-Z-_]+?)[ \t]+(.+)$/gm
  }

  parse(lineContent, line, matchResult) {
    const [match, beforeText, list, text] = matchResult
    return {
      beforeText,
      text,
      list,
      line,
      type: this.type,
    }
  }
}
