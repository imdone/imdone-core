const path = require('path')
const BacklogProject = require('./BacklogProject')
const {
  STORY_ID,
  TASK_ID,
  DONE,
  DOING,
  UNGROUPED_TASKS
} = BacklogProject.constants

class StoryProject extends BacklogProject {
  constructor(projectPath, config, storyId, ApplicationContext = require('./adapters/ApplicationContext')) {
    super(BacklogProject.getStoryProjectPath(projectPath, storyId), config, ApplicationContext)
    this.storyId = storyId
  }

  async addTask({content, storyId, group = UNGROUPED_TASKS}) {
    const meta = [
      { key: STORY_ID, value: storyId }
    ]
    const file = await this.addTaskToFile({list: this.defaultList, content, meta})
    file.rollback().extractTasks(this.config)
    const task = file.tasks[0]
    if (group !== UNGROUPED_TASKS) {
      await this.project.removeMetadata(task, 'group', UNGROUPED_TASKS)
      await this.project.addMetadata(task, 'group', group)
    }
    return file.tasks[0]
  }  

  async completeTask() {
    const task = this.getCurrentTask()
    if (!task) throw new Error('No current task')
    await this.project.moveTask(task, DONE)
    return task
  }

  getCurrentTask() {
    const tasks = this.project.getAllCards(`tags = task AND list = ${DOING}`)
    if (tasks.length > 0) return tasks[0]
    return null
  }

  getTasks(filter) {
    filter = filter ? ` AND ${filter}` : ''
    return this.project.getAllCards('tags=task' + filter)
  }

  getTask(taskId) {
    return this.project.getCards(`tags=task AND meta.${TASK_ID}="${taskId}"`)[0]
  }

  getStory() {
    return this.project.getAllCards(`tags=story`)[0]
  }

  get name() {
    return this.project.name
  }

}

StoryProject.createAndInit = async function(projectPath, config, storyId, ApplicationContext) {
  return (await (new StoryProject(projectPath, config, storyId, ApplicationContext)).init())
}

module.exports = StoryProject