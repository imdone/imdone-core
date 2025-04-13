import { describe, it, expect } from 'vitest'
import { Readable } from 'stream'
import eol from 'eol'
import { ReadStreamMarkdownParser } from '../ReadStreamMarkdownParser'
import { Config } from '../../../../config'

const LAST_LINE = '**last line**'
const CONTENT = `## My tasks
#DOING: A task with blank lines and card tags

- one
- two

${LAST_LINE}

#DOING: Task with only one blank line

A new line
`

const BLANK_LINES_CONTENT = `#DOING: Another task.  Has two blank lines
first line of content

<!--
created:2022-04-09T15:15:28.188Z
epic:"Release 1.29.0"
expand:1
-->
${LAST_LINE}


#DOING: One more task
`

describe('ReadStreamMarkdownParser', () => {
  it('Respects blankLinesToEndTask', async () => {
    const config = Config.newDefaultConfig()
    const content = BLANK_LINES_CONTENT.split(String(eol.auto)).map(
      (line) => line + String(eol.auto)
    )
    const parser = new ReadStreamMarkdownParser(Readable.from(content), config)
    const task = await parser.readTask()
    expect(task.description.length).to.equal(8)
    expect(task.description.pop()).to.equal(LAST_LINE)
    expect(task.line).to.equal(1)
    expect(task.lastLine).to.equal(9)
  })
})
