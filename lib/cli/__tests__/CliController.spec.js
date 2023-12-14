const isRunningInGithubAction = !!process.env.GITHUB_ACTION
const contextualDescribe = isRunningInGithubAction ? describe.skip : describe
const { configureProject, defaultProjectPath } = require("../ProjectConfigFactory")
const BacklogProject = require("../domain/BacklogProject")
const { 
  planStory,
  addTask,
  startTask
} = require('../CliControler')
const fs = require('fs').promises
const path = require('path')
const projectRoot = path.dirname(require.resolve('../../../package.json'))
const simpleGit = require('simple-git')
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
  const GIT_SSH_COMMAND = "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no"
  const ORIGIN = 'ssh://git@localhost:8022/home/git/test-project.git'
  const projectPath = path.join(projectRoot, 'temp', 'test-project')
  const defaultBranch = 'main'
  const remote = 'origin'
  const backlogProjectPath = defaultProjectPath(projectPath)
  let backlogProject
  let git

  beforeEach(async () => {
    await execCmd(path.join(projectRoot, 'devops', 'containers', 'setup-remote.sh'))
    try {
      await fs.rmdir(projectPath, {recursive: true})
    } catch (e) {
      console.log('no temp project to remove')
    } finally {
      await fs.mkdir(projectPath, {recursive: true})
    }
    process.env.PWD = projectPath
    git = simpleGit(projectPath).env({...process.env, GIT_SSH_COMMAND})
    const result = await configureProject({
      projectPath: backlogProjectPath,
      defaultBranch,
      remote
    })
    const { config } = result
    backlogProject = await BacklogProject.createAndInit(backlogProjectPath, config)
    await git.init().add('.').commit('initial commit')
    await git.addRemote(remote, ORIGIN)
    await git.push(remote, defaultBranch, {'--set-upstream': null})

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

function execCmd(cmd) {
  console.log('executing:', cmd)
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
   exec(cmd, (error, stdout, stderr) => {
    if (error) {
     console.warn(error);
     return reject(error)
    }
    console.log(`stdout: ${stdout} stderr: ${stderr}`);
    resolve(stdout? stdout : stderr);
   });
  });
 }