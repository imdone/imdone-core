import { ReadStreamTaskParser } from './ReadStreamTaskParser.js'
import { HashStyleTaskParser } from '../task/HashStyleTaskParser.js'
import { MarkdownStyleTaskParser } from '../task/MarkdownStyleTaskParser.js'
import { CheckStyleTaskParser } from '../task/CheckStyleTaskParser.js'
import { loadYAML } from '../../yaml.js'

const FRONTMATTER_DELIMITER = '---'
const CODE_FENCE_PATTERN = /^\s*(```|~~~)/
const INLINE_CODE_SPAN_PATTERN = /`[^`]*`/g

export class ReadStreamMarkdownParser extends ReadStreamTaskParser {
  constructor(readStream, config) {
    super(readStream, config)
    this.frontmatterLines = []
    this.collectingFrontmatter = false
    this.frontmatterClosed = false
    this.ignoredByFrontmatter = false
    this.currentLineIsFrontmatter = false
    this.currentLineIsCodeFence = false
    this.inCodeFence = false
    this.taskParsers = [
      new HashStyleTaskParser(config),
      new MarkdownStyleTaskParser(config),
    ]
    if (config.isAddCheckBoxTasks()) {
      this.taskParsers.push(new CheckStyleTaskParser(config))
    }
  }

  onLineRead(line) {
    this.updateFrontmatterState(line)
    this.updateCodeFenceState(line)
  }

  shouldParseTaskLine() {
    return !this.ignoredByFrontmatter &&
      !this.currentLineIsFrontmatter &&
      !this.currentLineIsCodeFence
  }

  getLineForTaskParsing(line) {
    return line.replace(INLINE_CODE_SPAN_PATTERN, (match) => ' '.repeat(match.length))
  }

  updateFrontmatterState(line) {
    const trimmed = line.trim()
    this.currentLineIsFrontmatter = false

    if (this.lineNo === 1 && isFrontmatterDelimiter(trimmed)) {
      this.collectingFrontmatter = true
      this.currentLineIsFrontmatter = true
      return
    }

    if (!this.collectingFrontmatter) return

    this.currentLineIsFrontmatter = true

    if (isFrontmatterDelimiter(trimmed)) {
      this.collectingFrontmatter = false
      this.frontmatterClosed = true
      this.updateIgnoredByFrontmatter()
      return
    }

    this.frontmatterLines.push(line)
  }

  updateIgnoredByFrontmatter() {
    if (!this.frontmatterClosed) return
    const data = parseFrontmatter(this.frontmatterLines)
    this.ignoredByFrontmatter = !!(data.imdone_ignore || data['kanban-plugin'])
  }

  updateCodeFenceState(line) {
    const isFence = CODE_FENCE_PATTERN.test(line)
    this.currentLineIsCodeFence = this.inCodeFence || isFence
    if (isFence) this.inCodeFence = !this.inCodeFence
  }
}

function isFrontmatterDelimiter(trimmedLine) {
  return trimmedLine === FRONTMATTER_DELIMITER
}

function parseFrontmatter(lines) {
  try {
    return loadYAML(lines.join('\n')) || {}
  } catch (error) {
    return {}
  }
}
