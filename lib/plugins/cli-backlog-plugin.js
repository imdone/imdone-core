const Plugin = require('imdone-api')

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
      const filterValue = encodeURIComponent(`meta.group = ${value} or tags = story`)
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

  getBoardActions() {
    return this.boardActionsMethod()
  }

  getCardProperties(task) {
    return {
      sid: generateRandomString(5)
    }
  }
}