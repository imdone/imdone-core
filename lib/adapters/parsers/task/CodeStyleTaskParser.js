import { TaskParser } from './TaskParser.js'

export class CodeStyleTaskParser extends TaskParser {
  constructor(config) {
    super('CODE', config)
  }

  get pattern() {
    return /^(.*?[ #]?)([A-Z]+[A-Z-_]+?)(:)?(-?[\d.]+(?:e-?\d+)?)?[ \t]+(.+)$/gm
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
