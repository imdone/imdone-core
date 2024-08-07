const { createFileSystemProject } = require('../../project-factory')
const { resolve } = path = require('path')
const STORIES_DIR = 'stories'
const STORY_ID = 'story-id'
const TASK_ID = 'task-id'
const TODO = 'TODO'
const DOING = 'DOING'
const DONE = 'DONE'
const ORDER = 'order'
const UNGROUPED_TASKS = 'Ungrouped Tasks'

class BacklogProject {
  constructor(projectPath, config, ApplicationContext = require('../adapters/ApplicationContext')) {
    this.ApplicationContext = ApplicationContext
    this.StorageAdapter = ApplicationContext().StorageAdapter
    this.projectPath = resolve(projectPath)
    this._config = config
    this.project = null
  }

  get path() {
    return this.projectPath
  }
  
  get name() {
    return this.project.name
  }

  get defaultList() {
    return this.config.getDefaultList()
  }

  get config() {
    return this.project && this.project.config || this._config
  }

  async init() {
    this.project = createFileSystemProject({path: this.projectPath, config: this.config})
    await this.project.init()
    this.storageAdapter = new this.StorageAdapter(this)
    return this
  }

  getStoryProjectPath(storyId) {
    return getStoryProjectPath(this.path, storyId)
  }

  async addStory(content) {
    await this.addTaskToFile({list: TODO, content })
  }

  toStoryId(text) {
    return this.project.sanitizeFileName(text)
  }

  removeList(list) {
    return this.project.removeList(list)
  }

  getStoryIds() {
    return [
      ...new Set(
        this.project.getCards(`meta.${STORY_ID}=* AND tags=story`).map(({meta, text, list}) => ({text, list, storyId: meta[STORY_ID][0]}))
      )
    ]
  }

  tasksToJson(tasks) {
    return tasks.map(({text, type, list, meta, content, tags, context, description, source, beforeText, order}) => 
      ({
        list,
        type,
        order,
        path: source.path,
        prefix: beforeText,
        text,
        content,
        description,
        tags,
        context,
        meta
      })
    )
  }
  
  getTaskName(task) {
    return this.toStoryId(task.text)
  }
  
  async startTask(taskId) {
    await this.init()
    
    const taskFilter = `meta.${TASK_ID}="${taskId}"`
    const task = this.project.getAllCards(taskFilter)[0]
    if (!task) throw new Error(`No task found with id ${taskId}`)
    
    const storyId = task.meta[STORY_ID][0]
    const storyFilter = `tags=story AND meta.${STORY_ID}="${storyId}"`
    const story = this.project.getAllCards(storyFilter)[0]
    
    await this.storageAdapter.initTaskUpdate(task)
    await this.moveTask(task, DOING, 0)
    await this.project.addMetadata(task, 'branch', this.storageAdapter.getTaskBranchName(task))
    this.project.rollBackFileForTask(task)
    await this.moveTask(story, DOING, 0)
    await this.storageAdapter.commitTaskUpdate(task)
  }

  async saveStory(storyId) {
    // // Switch to the story branch or create it
    // await git.checkout(storyBranchName);
    // await git.pull('origin', storyBranchName, { '--force': null });

    // // Push the changes to the story branch with force
    // await git.push('origin', storyBranchName, { '--force': null });

    // // Return to the original branch
    // await git.checkout(currentBranch);

    // Merge the story branch into the current branch

  }

  async moveTask(task, list, order) {
    return await this.project.moveTask(task, list, order)
  }

  async addTaskToFile({path, list, tags, content, meta, contexts=[]}) {
    return await this.project.addTaskToFile({path, list, tags, content, meta, contexts, useCardTemplate: true})
  }

  async addMetadata(task, key, value) {
    return await this.project.addMetadata(task, key, value)
  }

  getCurrentStoryId() {
    const tasks = this.project.getAllCards(`tags = "story" AND list = "${DOING}"`)
    if (tasks.length < 1) return
    return this.getStoryId(tasks[0])
  }

  getStoryId(task) {
    return task.meta[STORY_ID][0]
  }

  async getCurrentTask() {
    return await this.storageAdapter.getCurrentTask()
  }
}

function getStoryProjectPath(projectPath, storyId) {
  return path.join(projectPath, STORIES_DIR, storyId)
}

BacklogProject.getStoryProjectPath = getStoryProjectPath
BacklogProject.createAndInit = async function(projectPath, config, ApplicationContext) {
  return (await (new BacklogProject(projectPath, config, ApplicationContext)).init())
}

BacklogProject.constants = {
  STORIES_DIR,
  STORY_ID,
  TASK_ID,
  TODO,
  DOING,
  DONE,
  ORDER,
  UNGROUPED_TASKS
}
module.exports = BacklogProject