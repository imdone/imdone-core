const parse = require("../markdownStoryParser")
const expect = require("chai").expect
describe('markdownStoryParser', () => {
  it('should parse a markdown story name', () => {
    const markdown = `# story-id

This is the story description.

## Tasks
- [ ] An unfinished task

### Phase one (Interfaces)
- [ ] A task in phase one
- [ ] Another task in phase one
    - [ ] A sub task in phase one
    Some more data about the task

### Phase two (Implementation)
- [ ] A task in phase two
`
    const { name, description, tasks } = parse(markdown)
    expect(name).to.equal('story-id')
    expect(description).to.equal('This is the story description.')
    expect(tasks.length).to.equal(5)
    expect(tasks[0].text).to.equal('An unfinished task')
    expect(tasks[0].group).to.equal('ungrouped')
    expect(tasks[1].text).to.equal('A task in phase one')
    expect(tasks[1].group).to.equal('Phase one (Interfaces)')
    expect(tasks[2].text).to.equal('Another task in phase one')
    expect(tasks[2].group).to.equal('Phase one (Interfaces)')
    expect(tasks[3].text).to.equal("A sub task in phase one\nSome more data about the task")
    expect(tasks[3].group).to.equal('Phase one (Interfaces)')
    expect(tasks[4].text).to.equal('A task in phase two')
    expect(tasks[4].group).to.equal('Phase two (Implementation)')
  })
})