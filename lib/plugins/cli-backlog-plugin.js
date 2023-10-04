const Plugin = require('imdone-api')
const eol = require('eol')
const _path = require('path')
const {
  dirname
} = require('path')
const { rmdir } = require('fs').promises
const {
  UNGROUPED_TASKS,
  STORY_ID,
  ORDER
} = require('../cli/domain/BacklogProject').constants
const { newStoryProject } = require('../cli/ProjectConfigFactory')


const generateRandomString = (length) => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const PROJECT_TYPES = {
  BACKLOG_PROJECT: 'BACKLOG_PROJECT',
  STORY_PROJECT: 'STORY_PROJECT'
}

module.exports = class CliBacklogPlugin extends Plugin {
  get projectType() {
    return this.getSettings().projectType
  }

  get isStoryProject() {
    return this.projectType === PROJECT_TYPES.STORY_PROJECT
  }

  get isBacklogProject() { 
    return this.projectType === PROJECT_TYPES.BACKLOG_PROJECT
  }

  get cardActionsMethod() {
    return this.isStoryProject 
      ? this.getStoryProjectCardActions
      : this.isBacklogProject
      ? this.getBacklogProjectCardActions
      : () => []
  }

  get boardActionsMethod() {
    return this.isStoryProject 
      ? this.getStoryProjectBoardActions
      : this.isBacklogProject
      ? this.getBacklogProjectBoardActions
      : () => []

  }

  async onBeforeAddTask({path, list, meta, tags, contexts, content}) {
    if (!this.isBacklogProject) return {path, content, meta, tags, contexts}
    const project = this.project
    const storyId = project.sanitizeFileName(eol.split(content)[0])
    const storyProject = await newStoryProject({projectPath: project.path, storyId})
    path = _path.join(storyProject.path, 'README.md')
    meta.push({key: STORY_ID, value: storyId})
    meta.push({key: ORDER, value: 0})
    return {path, content, meta, tags, contexts}
  }

  async onAfterDeleteTask(task) {
    if (!this.isBacklogProject) return
    const project = this.project
    await rmdir(dirname(task.fullPath), {recursive: true})
  }

  getStoryProjectBoardActions() {
    const project = this.project
    
    const groups = [...new Set(
      project.getCards('meta.group = *').map((card) => card.meta.group && card.meta.group[0])
    )].map(group => {
      const name = group
      const value = `"${group}"`
      return { name, value}
    })
    return [{name: 'All tasks', value: '*'}, ...groups].map(({name, value}) => {
      const filterValue = encodeURIComponent(`meta.group = ${value} and tags = task`)
      return {
        name,
        action: function () {
          project.openUrl(`imdone://active.repo?filter=${filterValue}`)
        }
      }
    })
  }

  getBacklogProjectBoardActions() {
    return []
  }

  getStoryProjectCardActions(card) {
    return []
  }

  getBacklogProjectCardActions(card) {
    const fullPath = card.fullPath
    const project = this.project
    const storyProjectPath = dirname(fullPath)
    const title = `Open story tasks`
    return card.tags.includes('story') ? [
      {
        action: function () {
          project.openUrl(`imdone://${storyProjectPath}`)
        },
        pack: 'fas',
        icon: 'check-square',
        title
      }
    ] : []
  } 

  getCardActions(card) {
    return this.cardActionsMethod(card)
  }

  getBoardActions() {
    return this.boardActionsMethod()
  }

  getCardProperties(task) {
    return {
      sid: generateRandomString(5),
      projectName: this.project.name,
      ungroupedTasks: UNGROUPED_TASKS
    }
  }
}