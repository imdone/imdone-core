const { Readable } = require('stream')
const eol = require('eol')
const ApplicationContext = require('../../../../context/ApplicationContext')
const ReadStreamMarkdownParser = require('../ReadStreamMarkdownParser')
const constants = require('../../../../constants')
const Config = require('../../../../config')

const LAST_LINE = '**last line**'
const CONTENT = `## My tasks
#DOING: A task with blank lines and card tags
<card>
- one
- two


${LAST_LINE}
</card>

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
  it('Respects <card></card> tags card end.', async () => {
    const config = new Config(constants.DEFAULT_CONFIG)
    ApplicationContext.register(Config, config)
    const content = CONTENT.split(String(eol.auto)).map(
      (line) => line + String(eol.auto)
    )
    const parser = new ReadStreamMarkdownParser(Readable.from(content))
    const task = await parser.readTask()
    task.hasCardTags.should.be.true()
    task.description.length.should.equal(5)
    task.description.pop().should.equal(LAST_LINE)
    task.line.should.equal(2)
    task.lastLine.should.equal(9)
  })

  it('Respects blankLinesToEndTask = 1 if configured', async () => {
    const config = new Config(constants.DEFAULT_CONFIG)
    config.settings = {
      cards: {
        blankLinesToEndTask: 1,
      },
    }
    ApplicationContext.register(Config, config)
    const content = BLANK_LINES_CONTENT.split(String(eol.auto)).map(
      (line) => line + String(eol.auto)
    )
    const parser = new ReadStreamMarkdownParser(Readable.from(content))
    const task = await parser.readTask()
    task.description.length.should.equal(1)
    task.line.should.equal(1)
    task.lastLine.should.equal(2)
  })

  it('Respects blankLinesToEndTask = 2 if configured', async () => {
    const config = new Config(constants.DEFAULT_CONFIG)
    config.settings = {
      cards: {
        blankLinesToEndTask: 2,
      },
    }
    ApplicationContext.register(Config, config)
    const content = BLANK_LINES_CONTENT.split(String(eol.auto)).map(
      (line) => line + String(eol.auto)
    )
    const parser = new ReadStreamMarkdownParser(Readable.from(content))
    const task = await parser.readTask()
    task.description.length.should.equal(8)
    task.description.pop().should.equal(LAST_LINE)
    task.line.should.equal(1)
    task.lastLine.should.equal(8)
  })
})
