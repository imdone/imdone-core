const { createFileSystemProject } = require('../../project-factory')
const { resolve } = path = require('path')
const STORIES_DIR = 'stories'
const TASK_ID = 'task-id'
const STORY_ID = 'story-id'
const DOING = 'DOING'

module.exports = class BacklogProject {
  constructor(projectPath, config, ApplicationContext = require('./adapters/ApplicationContext')) {
    this.ApplicationContext = ApplicationContext
    this.projectPath = resolve(projectPath)
    this.config = config
    this.project = null
  }

  get path() {
    return this.projectPath
  }

  async init() {
    this.project = createFileSystemProject({path: this.projectPath, config: this.config})
    await this.project.init()
  }

  getStoryProjectPath(storyId) {
    return path.join(this.projectPath, STORIES_DIR, storyId)
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

    await setProjectPath(this.getStoryProjectPath(storyId))
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

  
}