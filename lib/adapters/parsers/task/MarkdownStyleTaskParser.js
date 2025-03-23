import { TaskParser } from './TaskParser'

export class MarkdownStyleTaskParser extends TaskParser {
  constructor(config) {
    super('MARKDOWN', config)
  }

  get pattern() {
    return /^(.*)(\[(.+?)\]\(#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?\))/gm
  }

  parse(lineContent, line, matchResult) {
    const [match, beforeText, rawTask, text, list, colon, order] = matchResult
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
