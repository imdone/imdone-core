const path = require('path')
const BacklogProject = require('./BacklogProject')
const STORIES_DIR = 'stories'
const STORY_ID = 'story-id'
const TASK_ID = 'task-id'
const DOING = 'DOING'
const ORDER = 'order'

class StoryProject extends BacklogProject {
  constructor(projectPath, config, storyId, ApplicationContext = require('./adapters/ApplicationContext')) {
    super(projectPath, config, ApplicationContext)
    this.storyId = storyId
  }

  // #### Start a task
// ```bash
// npx imdone start <task-id>
// ```
// - [x] This should find the task and create a branch named `story/<sid>/<group>/<task id>/<task filname>`
// - [x] Move the task to the `DOING` list
// - [x] If the branch exists, check it out
// - [x] Set the task id in session so we know what to close
// - [x] Save the branch name in session so we can check it out again
// - [x] Pull the branch if it exists
  async startTask(taskId) {
    const {
      setProjectPath,
      setTaskId,
      setStoryId,
      setBranchName,
    } = this.ApplicationContext.session
    const git = this.ApplicationContext.git
    await this.init()
    const task = this.project.getCards().find(({meta}) => meta[TASK_ID] && meta[TASK_ID][0] === taskId)
    const storyId = task.meta[STORY_ID][0]
    const taskName = this.project.sanitizeFileName(task.text)
    const branchName = `story/${storyId}/task/${taskName}`

    await setProjectPath(this.projectPath)
    await setTaskId(taskId)
    await setStoryId(storyId)
    await setBranchName(branchName)

    this.project.moveTask(task, DOING, 0)

    await git.fetch()
    const branches = await git.branchLocal()

    if (branches.current !== branchName) {
      if (!branches.all.includes(branchName)) await git.checkoutBranch(branchName, 'HEAD')
      else await git.checkout(branchName)
    }

    const remoteBranches = await git.branch(['-r'])
    if (remoteBranches.all.includes(`origin/${branchName}`)) await git.pull()
  }

  async addTasks(tasks) {
    tasks.forEach(async (task, i) => {
      const order = (i + 1) * (10)
      const list = task.done ? DONE : TODO
      const file = await storyProject.project.addTaskToFile({list, tags: ['task'], content: task.text})
      file.rollback()
        .extractTasks(backlogProject.config)
      
      await storyProject.project.addMetadata(file.tasks[0], 'group', task.group)
      await storyProject.project.addMetadata(file.tasks[0], STORY_ID, storyId)
      await storyProject.project.addMetadata(file.tasks[0], ORDER, order)
    })
  }  

  async addStoryTask(description) {
    const storyPath = path.join(this.path, 'README.md')
    const file = await this.addTaskToFile({ path: storyPath, list: 'NOTE', tags: ['story'], content: description })
    file.rollback().extractTasks(this.config)
    await this.addMetadata(file.tasks[0], ORDER, 0)
    await this.addMetadata(file.tasks[0], STORY_ID, storyId)
  }

  async addTaskToFile({path, list, tags, content}) {
    return await this.project.addTaskToFile({path, list, tags, content})
  }

  async addMetadata(task, key, value) {
    return await this.project.addMetadata(task, key, value)
  }

}

function getStoryProjectPath(projectPath, storyId) {
  return path.join(projectPath, STORIES_DIR, storyId)
}

StoryProject.getStoryProjectPath = getStoryProjectPath

module.exports = StoryProject