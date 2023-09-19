const path = require('path')
const BacklogProject = require('./BacklogProject')
const {
  STORIES_DIR,
  STORY_ID,
  TASK_ID,
  TODO,
  DONE,
  ORDER,
} = BacklogProject.constants

class StoryProject extends BacklogProject {
  constructor(projectPath, config, storyId, ApplicationContext = require('./adapters/ApplicationContext')) {
    super(getStoryProjectPath(projectPath, storyId), config, ApplicationContext)
    this.storyId = storyId
  }

  async addTasks(tasks) {
    tasks.forEach(async (task, i) => {
      const order = (i + 1) * (10)
      const list = task.done ? DONE : TODO
      const meta = [
        { key: 'group', value: task.group },
        { key: STORY_ID, value: this.storyId },
        { key: ORDER, value: order }
      ]
      await this.addTaskToFile({list, tags: ['task'], content: task.text, meta})
    })
  }

  async addTask({content, storyId, group}) {
    const meta = [
      { key: STORY_ID, value: storyId }
    ]
    if (group) meta.push({ key: 'group', value: group })
  
    const file = await this.addTaskToFile({list: this.defaultList, tags: ['task'], content, meta})
    file.rollback().extractTasks(this.config)
    return file.tasks[0]
  }  

  async addStory(content, group) {
    const storyPath = path.join(this.path, 'README.md')
    const file = await this.addTaskToFile({ path: storyPath, list: 'CURRENT', tags: ['story'], content })
    file.rollback().extractTasks(this.config)
    if (group) await this.addMetadata(file.tasks[0], 'group', group)
    await this.addMetadata(file.tasks[0], ORDER, 0)
    await this.addMetadata(file.tasks[0], STORY_ID, this.storyId)
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

function getStoryProjectPath(projectPath, storyId) {
  return path.join(projectPath, STORIES_DIR, storyId)
}

StoryProject.getStoryProjectPath = getStoryProjectPath

module.exports = StoryProject