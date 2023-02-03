const FileProjectContext = require('./domain/entities/FileProjectContext')

module.exports = class ProjectContext extends FileProjectContext {
  constructor(repo) {
    super()
    this.repo = repo
  }

  getOrder(list, order) {
    const config = this.repo.config
    const tasks =
      list && this.repo.listExists(list) ? this.repo.getTasksInList(list) : null
    return getOrder(config, order, tasks)
  }

  get config() {
    return this.repo.config
  }

  toJSON() {
    return null
  }
}

const getOrder = function (config, order, tasks) {
  if (!config) return 0
  if(isNumber(order)) {
    order = Number(order)
    if (config.keepEmptyPriority) {
      return ''
    } else if (tasks) {
      if (tasks.length == 0) {
        return 0
      } else if (config.isAddNewCardsToTop()) {
        return (isNumber(tasks[0].order) ? tasks[0].order : 0) - 10
      } else {
        return (isNumber(tasks[tasks.length - 1].order) ? tasks[tasks.length - 1].order : 0) + 10
      }
    }
  }
  return order
}

function isNumber(num) {
  return typeof num === 'number' && !isNaN(num)
}