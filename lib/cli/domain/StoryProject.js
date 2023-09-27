const path = require('path')
const BacklogProject = require('./BacklogProject')
const {
  STORIES_DIR,
  STORY_ID,
  TASK_ID,
  TODO,
  DONE,
  ORDER,
  UNGROUPED_TASKS
} = BacklogProject.constants

class StoryProject extends BacklogProject {
  constructor(projectPath, config, storyId, ApplicationContext = require('./adapters/ApplicationContext')) {
    super(BacklogProject.getStoryProjectPath(projectPath, storyId), config, ApplicationContext)
    this.storyId = storyId
  }

  async addTasks(tasks) {
    tasks.forEach(async (task, i) => {
      const order = (i + 1) * (10)
      const list = task.done ? DONE : TODO
      const meta = [
        { key: 'group', value: task.group },
        { key: ORDER, value: order }
      ]
      await this.addTaskToFile({list, content: task.text, meta})
    })
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
    return this.project.getCards(`meta.${TASK_ID} = ${taskId}`)[0]
  }

  getTasks(filter) {
    filter = filter ? ` AND ${filter}` : ''
    return this.project.getCards('tags = task' + filter)
  }

  getStory() {
    return this.project.getCards(`tags=story`)[0]
  }

  get name() {
    return this.project.name
  }

}

StoryProject.createAndInit = async function(projectPath, config, storyId, ApplicationContext) {
  return (await (new StoryProject(projectPath, config, storyId, ApplicationContext)).init())
}

module.exports = StoryProject