const {
  getBeforeEach,
  contextualDescribe
} = require('./SetUpTestBacklogProjectWithRemote')
const { parse, importMarkdown } = require("../MDStoryParser")
const expect = require("chai").expect

const MARKDOWN = `# story-id

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
  Some more data about the task!
  - [ ] A sub task in phase one
    Some more data about the task

### Phase two (Implementation)
- [ ] A task in phase two
`

TASKS_MARKDOWN = `
## Tasks

- [ ] A new imported task A
- [ ] A new imported task B
`
const DESCRIPTION = MARKDOWN.split('\n').slice(2,14).join('\n')

describe('MDStoryParser.parse', () => {
  it('should parse a markdown story name', () => {
    const { storyText, description, tasks } = parse(MARKDOWN)
    expect(storyText).to.equal('story-id')
    expect(description).to.equal(DESCRIPTION)
    expect(tasks.length).to.equal(5)
    expect(tasks[0].text).to.equal('An unfinished task')
    expect(tasks[0].group).to.equal('Ungrouped Tasks')
    expect(tasks[0].done).to.equal(false)
    expect(tasks[1].text).to.equal('A task in phase one')
    expect(tasks[1].group).to.equal('Phase one (Interfaces)')
    expect(tasks[1].done).to.equal(true)
    expect(tasks[2].text).to.equal('Another task in phase one\nSome more data about the task!')
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

contextualDescribe('MDStoryParser.importMarkdown', () => {
  let { backlogProject, git, beforeEachFunc } = getBeforeEach()
  beforeEach(async () => {
    const result = await beforeEachFunc()
    backlogProject = result.backlogProject
    git = result.git
  })

  it('should import a story definition and tasks from markdown and return the storyProject', async () => {
    const storyId = 'story-id'
    const storyProject = await importMarkdown({projectPath: backlogProject.projectPath, markdown: MARKDOWN})
    const branch = (await git.branchLocal()).current

    should(storyProject.storyId).equal(storyId)

    const tasks = storyProject.getTasks()
    should(tasks.length).equal(5)
    should(tasks[0].text).equal('An unfinished task')
    should(tasks[1].text).equal('A task in phase one')
    should(tasks[2].text).equal('Another task in phase one')
    should(tasks[3].text).equal('A sub task in phase one')
    should(tasks[4].text).equal('A task in phase two')
    should(branch).equal(`story/${storyId}/main`)
    should((await git.status()).isClean()).be.true()
  })

  it('should import tasks from markdown to an existing story and return the storyProject', async () => {
    const storyId = existingStoryId = 'story-id'
    let storyProject = await importMarkdown({projectPath: backlogProject.projectPath, markdown: MARKDOWN})
    let branch = (await git.branchLocal()).current

    should(storyProject.storyId).equal(storyId)

    let tasks = storyProject.getTasks()
    should(tasks.length).equal(5)
    should(tasks[0].text).equal('An unfinished task')
    should(tasks[1].text).equal('A task in phase one')
    should(tasks[2].text).equal('Another task in phase one')
    should(tasks[3].text).equal('A sub task in phase one')
    should(tasks[4].text).equal('A task in phase two')
    should(branch).equal(`story/${storyId}/main`)
    should((await git.status()).isClean()).be.true()

    storyProject = await importMarkdown({projectPath: backlogProject.projectPath, markdown: TASKS_MARKDOWN, existingStoryId})
    branch = (await git.branchLocal()).current

    should(storyProject.storyId).equal(storyId)

    tasks = storyProject.getTasks()
    should(tasks.length).equal(7)

  })

})