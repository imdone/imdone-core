const path = require('path')
const BacklogProject = require('./BacklogProject')
const {
  STORIES_DIR,
  STORY_ID,
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
      const file = await this.addTaskToFile({list, tags: ['task'], content: task.text})
      file.rollback().extractTasks(this.config)
      
      await this.addMetadata(file.tasks[0], 'group', task.group)
      await this.addMetadata(file.tasks[0], STORY_ID, this.storyId)
      await this.addMetadata(file.tasks[0], ORDER, order)
    })
  }  

  async addStoryTask(description) {
    const storyPath = path.join(this.path, 'README.md')
    const file = await this.addTaskToFile({ path: storyPath, list: 'CURRENT', tags: ['story'], content: description })
    file.rollback().extractTasks(this.config)
    await this.addMetadata(file.tasks[0], ORDER, 0)
    await this.addMetadata(file.tasks[0], STORY_ID, this.storyId)
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