const TaskParser = require('./TaskParser')

module.exports = class CheckStyleTaskParser extends TaskParser {
  constructor() {
    super()
  }

  get pattern() {
    return /^(\s*- \[([x ])\]\s)(.+$)/gm
  }

  parse(lineContent, line, matchResult, task) {
    let [match, beforeText, checked, text] = matchResult
    if (
      (task && !task.beforeText) ||
      (task && task.beforeText.length !== beforeText.length)
    )
      return
    checked = checked.trim() === 'x'
    return {
      beforeText,
      text,
      line,
      checked,
      type: this.config.getNewCardSyntax(),
    }
  }
}
