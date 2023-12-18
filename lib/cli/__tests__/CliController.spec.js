const {
  getBeforeEach,
  contextualDescribe
} = require('./SetUpTestBacklogProjectWithRemote')
const BacklogProject = require("../domain/BacklogProject")
const { 
  planStory,
  addTask,
  startTask
} = require('../CliControler')
const markdown = `# my story id

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
  Some more info about the task
  - [ ] A sub task in phase one
    Some more data about the task

### Phase two (Implementation)
- [ ] A task in phase two
`
contextualDescribe('CliController', async () => {
  let { backlogProject, git, beforeEachFunc } = getBeforeEach()
  beforeEach(async () => {
    const result = await beforeEachFunc()
    backlogProject = result.backlogProject
    git = result.git
  })

  describe('planStory', async () => {
    it('should import a story from markdown', async () => {
      const storyId = 'my-story-id'
      const storyProject = await planStory(markdown, console.log)
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
  })

  describe('startTask', async () => {
    it('should move the task and story to DOING and create a task branch', async () => {
      const storyId = 'my-story-id'
      const storyProject = await planStory(markdown, console.log)
      const tasks = storyProject.getTasks()
      const task = tasks[0]
      
      const taskId = storyProject.getTaskId(task)
      const taskName = backlogProject.getTaskName(task)
      await startTask(taskId, console.log)

      const currentBranch = (await git.branchLocal()).current
      should(currentBranch).be.equal(`story/${storyId}/task/${taskName}`)
      await storyProject.init()
      const currentTask = await storyProject.getCurrentTask()
      currentTask.list.should.equal(BacklogProject.constants.DOING)
      storyProject.getStory().list.should.equal(BacklogProject.constants.DOING)
    })
  })

  describe.skip('addTask', async () => {
    it('should add a task to the story', async () => {
      const storyId = 'my-story-id'
      const storyProject = await planStory(markdown, console.log)
      const tasks = storyProject.getTasks()
      const task = tasks[0]
      
      const taskId = storyProject.getTaskId(task)
      const taskName = backlogProject.getTaskName(task)
      await backlogProject.startTask(taskId)

      const currentBranch = (await git.branchLocal()).current
      should(currentBranch).be.equal(`story/${storyId}/task/${taskName}`)
      await storyProject.init()
      const currentTask = await storyProject.getCurrentTask()
      currentTask.list.should.equal(BacklogProject.constants.DOING)
      storyProject.getStory().list.should.equal(BacklogProject.constants.DOING)
    })
  })
})
