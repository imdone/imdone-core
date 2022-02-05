const TaskParser = require("./TaskParser");

module.exports = class HashStyleTaskParser extends TaskParser {

  constructor () {
    super("HASHTAG")
  }

  get pattern () {
    return /#([a-zA-Z-_]+?):(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm
  }

  parse (lineContent, line, result) {
    const [match, list, order, junk, text] = result
    return {
      text,
      order,
      list,
      line
    }
  }
}