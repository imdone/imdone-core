const TaskParser = require("./TaskParser");

module.exports = class CheckStyleTaskParser extends TaskParser {

  constructor () {
    super("HASHTAG")
  }

  get pattern () {
    return /^(\s*- \[([x ])\]\s)(.+$)/gm
  }

  parse (lineContent, line, result) {
    let [match, beforeText, checked, text] = result
    checked = checked.trim() === 'x'
    return {
      beforeText,
      text,
      line,
      checked
    }
  }
}