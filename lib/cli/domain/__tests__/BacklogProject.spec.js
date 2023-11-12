const { configureProject, defaultProjectPath } = require("../../ProjectConfigFactory")
const BacklogProject = require("../BacklogProject")
const StoryProject = require("../StoryProject")
const fs = require('fs').promises
const path = require('path')
const projectRoot = path.dirname(require.resolve('../../../../package.json'))
const simpleGit = require('simple-git')
const debug = require('debug')
// debug.enable('simple-git')

function exec(cmd) {
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
   exec(cmd, (error, stdout, stderr) => {
    if (error) {
     console.warn(error);
    }
    resolve(stdout? stdout : stderr);
   });
  });
 }
describe('BackogProject', () => {
  describe('startTask', () => {
    const GIT_SSH_COMMAND = "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no"
    const ORIGIN = 'ssh://git@localhost:8022/home/git/test-project.git'
    const projectPath = path.join(projectRoot, 'tmp', 'test-project')
    const defaultBranch = 'main'
    const remote = 'origin'
    const backlogProjectPath = defaultProjectPath(projectPath)
    let backlogProject
    let git

    beforeEach(async () => {
      // const containersPath = path.join(projectRoot, 'devops', 'containers')
      // await exec(`cd ${containersPath} && ./remove-remote.sh && ./setup-remote.sh`)
      try {
        await fs.rmdir(projectPath, {recursive: true})
      } finally {
        await fs.mkdir(projectPath, {recursive: true})
      }
      git = simpleGit(projectPath).env({...process.env, GIT_SSH_COMMAND})
      const result = await configureProject({
        projectPath: backlogProjectPath,
        defaultBranch,
        remote
      })
      const { config } = result
      backlogProject = await BacklogProject.createAndInit(backlogProjectPath, config)
      await git.init().add('.').commit('initial commit')
      await git.addRemote('origin', ORIGIN)
    })

    it('should move the task to DOING and create a task branch', async () => {
      await backlogProject.addStory('test story')
      const storyId = backlogProject.getStoryIds()[0].storyId
      const storyProject = await StoryProject.createAndInit(backlogProjectPath, backlogProject.config, storyId)
      const task = await storyProject.addTask({storyId, content: 'A test task\nWith test content'})
      await git.add('.').commit('Commit test project story and task')
      await git.push('origin', defaultBranch, {'--set-upstream': null})

      const taskId = storyProject.getTaskId(task)
      await backlogProject.startTask(taskId)

      console.log('projectPath', projectPath)
    })
  })

  describe.skip('saveStory', () => {
    beforeEach(() => {
      
    })

    it('should not save the story if the branch has changes', () => {
      
    })

    it("should checkout the default branch", () => {

    })

    it("should create a story branch if it doesn't exist", () => {

    })

    it('should add the story folder, file and task files', () => {

    })

    it('should git add the storyFolder and commit the changes', () => {

    })

    it ('should git push the story branch', () => {
    })

    it('should git checkout the currentBranch', () => {
    })

    it('should merge the story branch (story folder only) into the current branch', () => {
    })
  })
})