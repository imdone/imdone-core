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

async function readTasks(parser) {
  const tasks = []
  let task = true
  while (task) {
    task = await parser.readTask()
    if (task) tasks.push(task)
  }
  parser.close()
  return tasks
}

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

  it('reads checkbox tasks when checkbox task discovery is enabled', async () => {
    const config = Config.newDefaultConfig()
    config.settings = {
      newCardSyntax: 'MARKDOWN',
      cards: {
        addCheckBoxTasks: true,
        defaultList: 'TODO',
        doneList: 'DONE',
      },
    }
    const content = `- [ ] An unchecked task

- [x] A completed task
`
    const parser = new ReadStreamMarkdownParser(Readable.from(content), config)
    const tasks = await readTasks(parser)

    expect(tasks).to.have.length(2)
    expect(tasks[0]).toMatchObject({
      text: 'An unchecked task',
      list: 'TODO',
      line: 1,
      checked: false,
      type: 'MARKDOWN',
    })
    expect(tasks[1]).toMatchObject({
      text: 'A completed task',
      list: 'DONE',
      line: 3,
      checked: true,
      type: 'MARKDOWN',
    })
  })

  it('ignores tasks when frontmatter marks the file as ignored', async () => {
    const config = Config.newDefaultConfig()
    const ignoredFiles = [
      `---
imdone_ignore: true
---

#TODO Hidden task


`,
      `---
kanban-plugin: true
---

#TODO Hidden task


`,
    ]

    for (const content of ignoredFiles) {
      const parser = new ReadStreamMarkdownParser(Readable.from(content), config)
      const tasks = await readTasks(parser)
      expect(tasks).to.have.length(0)
    }
  })

  it('ignores task-looking text inside markdown code spans and fenced code blocks', async () => {
    const config = Config.newDefaultConfig()
    const content = `\`#TODO Hidden inline task\`

\`\`\`markdown
#TODO Hidden fenced task
\`\`\`
`
    const parser = new ReadStreamMarkdownParser(Readable.from(content), config)
    const tasks = await readTasks(parser)

    expect(tasks).to.have.length(0)
  })

  it('preserves inline code spans in task titles', async () => {
    const config = Config.newDefaultConfig()
    const content = `#TODO stories with \`github:true\` or \`jira:true\` should get created on push with good defaults

`
    const parser = new ReadStreamMarkdownParser(Readable.from(content), config)
    const tasks = await readTasks(parser)

    expect(tasks).to.have.length(1)
    expect(tasks[0]).toMatchObject({
      text: 'stories with `github:true` or `jira:true` should get created on push with good defaults',
      list: 'TODO',
      line: 1,
      type: 'HASHTAG',
    })
  })
})
