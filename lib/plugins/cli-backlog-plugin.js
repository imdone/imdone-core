const Plugin = require('imdone-api')
const {
  dirname
} = require('path')
const {
  UNGROUPED_TASKS
} = require('../cli/domain/BacklogProject').constants

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
    return [
      {
        action: function () {
          project.openUrl(`imdone://${storyProjectPath}`)
        },
        pack: 'fas',
        icon: 'check-square',
        title
      }
    ]
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