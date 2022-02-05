const TaskParser = require("./TaskParser");

module.exports = class HashStyleOrderMetaTaskParser extends TaskParser {

  constructor () {
    super("HASH_META_ORDER")
  }

  get pattern () {
    return /#([a-zA-Z-_]+?)[ \t]+(.+)$/gm
  }

  parse (lineContent, line, result) {
    const [match, list, text] = result
    return {
      text,
      list,
      line
    }
  }
}