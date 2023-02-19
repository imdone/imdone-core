const FileProjectContext = require('./domain/entities/FileProjectContext')
const { isNumber } = require('./task')

module.exports = class ProjectContext extends FileProjectContext {
  constructor(repo) {
    super()
    this.repo = repo
  }

  getOrder(list, order) {
    const config = this.repo.config
    if (config && config.keepEmptyPriority && order === undefined) return
    const tasks =
      list && this.repo.listExists(list) ? this.repo.getTasksInList(list) : []
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
  if (isNumber(order)) return Number(order)
  if (config.keepEmptyPriority) return ''
  if (tasks) {
    if (tasks.length == 0) {
      return 0
    } else if (config.isAddNewCardsToTop()) {
      return (isNumber(tasks[0].order) ? tasks[0].order : 0) - 10
    } else {
      const lastTask = tasks[tasks.length - 1]
      return (lastTask && isNumber(lastTask.order) ? lastTask.order : 0) + 10
    }
  }
  return 0
}
