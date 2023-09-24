const { parse } = require("../MarkdownStoryParser")
const expect = require("chai").expect
describe('MarkdownStoryParser', () => {
  it('should parse a markdown story name', () => {
    const markdown = `# story-id

This is the story description.

- [ ] A simple task

\`\`\`md
This is a block of markdown
so it can contain anything
- [ ] A task
- [x] Another task
\`\`\`

And a paragraph after the code block.

## Tasks
- [ ] An unfinished task

### Phase one (Interfaces)
- [x] A task in phase one
- [ ] Another task in phase one
    - [ ] A sub task in phase one
    Some more data about the task

### Phase two (Implementation)
- [ ] A task in phase two
`
    const { storyId, description, tasks } = parse(markdown)
    expect(storyId).to.equal('story-id')
    expect(description).to.equal(`This is the story description.

- [ ] A simple task

\`\`\`md
This is a block of markdown
so it can contain anything
- [ ] A task
- [x] Another task
\`\`\`

And a paragraph after the code block.`)
    expect(tasks.length).to.equal(5)
    expect(tasks[0].text).to.equal('An unfinished task')
    expect(tasks[0].group).to.equal('Ungrouped Tasks')
    expect(tasks[0].done).to.equal(false)
    expect(tasks[1].text).to.equal('A task in phase one')
    expect(tasks[1].group).to.equal('Phase one (Interfaces)')
    expect(tasks[1].done).to.equal(true)
    expect(tasks[2].text).to.equal('Another task in phase one')
    expect(tasks[2].group).to.equal('Phase one (Interfaces)')
    expect(tasks[2].done).to.equal(false)
    expect(tasks[3].text).to.equal("A sub task in phase one\nSome more data about the task")
    expect(tasks[3].group).to.equal('Phase one (Interfaces)')
    expect(tasks[3].done).to.equal(false)
    expect(tasks[4].text).to.equal('A task in phase two')
    expect(tasks[4].group).to.equal('Phase two (Implementation)')
    expect(tasks[4].done).to.equal(false)
  })
})