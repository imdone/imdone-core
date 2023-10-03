const path = require('path')
const BacklogProject = require('./BacklogProject')
const {
  STORY_ID,
  TASK_ID,
  DONE,
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
    meta.push({ key: 'group', value: group })
  
    const file = await this.addTaskToFile({list: this.defaultList, content, meta})
    file.rollback().extractTasks(this.config)
    return file.tasks[0]
  }  

  async completeTask() {
    const task = await this.getCurrentTask()
    await this.project.moveTask(task, DONE)
    return task
  }

  async getCurrentTask() {
    const taskId = await this.ApplicationContext().session.getTaskId()
    return this.project.getAllCards(`meta.${TASK_ID} = "${taskId}"`)[0]
  }

  getTasks(filter) {
    filter = filter ? ` AND ${filter}` : ''
    return this.project.getAllCards('tags=task' + filter)
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