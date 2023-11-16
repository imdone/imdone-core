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
  constructor(projectPath, config, storyId, ApplicationContext = require('../adapters/ApplicationContext')) {
    super(BacklogProject.getStoryProjectPath(projectPath, storyId), config, ApplicationContext)
    this.storyId = storyId
  }

  async addTask({content, group = UNGROUPED_TASKS}) {
    const file = await this.addTaskToFile({list: this.defaultList, content})
    file.rollback().extractTasks(this.config)
    const task = file.tasks[0]
    if (group !== UNGROUPED_TASKS) {
      await this.project.removeMetadata(task, 'group', UNGROUPED_TASKS)
      await this.project.addMetadata(task, 'group', group)
    }
    return file.tasks[0]
  }  

  async completeTask() {
    const task = await this.getCurrentTask()
    if (!task) throw new Error('No current task')
    await this.project.moveTask(task, DONE)
    return task
  }

  getTaskId(task) {
    return task.meta[TASK_ID][0]
  }

  getTaskName(task) {
    const ext = path.extname(task.file.path)
    return path.basename(task.file.path, ext)
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