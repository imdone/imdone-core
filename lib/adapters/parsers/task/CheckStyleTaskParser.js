const TaskParser = require('./TaskParser')

module.exports = class CheckStyleTaskParser extends TaskParser {
  constructor() {
    super()
  }

  get pattern() {
    return /^(\s*- \[([x ])\]\s)(.+$)/gm
  }

  parse(lineContent, line, matchResult, task) {
    if (task) return null
    let [match, beforeText, checked, text] = matchResult
    checked = checked.trim() === 'x'
    return {
      beforeText,
      text,
      line,
      checked,
    }
  }
}
