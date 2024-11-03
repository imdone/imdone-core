const { Readable } = require('stream')
const eol = require('eol')
const ReadStreamMarkdownParser = require('../ReadStreamMarkdownParser')
const Config = require('../../../../config')

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
    task.description.length.should.equal(8)
    task.description.pop().should.equal(LAST_LINE)
    task.line.should.equal(1)
    task.lastLine.should.equal(8)
  })
})
