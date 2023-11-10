const { configureProject, defaultProjectPath } = require("../../ProjectConfigFactory")
const BacklogProject = require("../BacklogProject")
const StoryProject = require("../StoryProject")
const fs = require('fs').promises
const path = require('path')
const projectRoot = path.dirname(require.resolve('../../../../package.json'))
const simpleGit = require('simple-git')

describe('BackogProject', () => {
  describe('startTask', () => {
    const projectPath = path.join(projectRoot, 'tmp', 'test-project')
    const defaultBranch = 'main'
    const remote = 'origin'
    const backlogProjectPath = defaultProjectPath(projectPath)
    let backlogProject
    let git

    beforeEach(async () => {
      try {
        await fs.rmdir(projectPath, {recursive: true})
      } finally {
        await fs.mkdir(projectPath, {recursive: true})
      }
      git = simpleGit(projectPath)
      const result = await configureProject({
        projectPath: backlogProjectPath,
        defaultBranch,
        remote
      })
      const { config } = result
      backlogProject = await BacklogProject.createAndInit(backlogProjectPath, config)
      await git.init().add('.').commit('initial commit')
    })

    it('should move the task to DOING and create a task branch', async () => {
      await backlogProject.addStory('test story')
      const storyId = backlogProject.getStoryIds()[0].storyId
      const storyProject = await StoryProject.createAndInit(backlogProjectPath, backlogProject.config, storyId)
      const task = await storyProject.addTask({storyId, content: 'A test task\nWith test content'})
      await git.add('.').commit('Commit test project story and task')

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