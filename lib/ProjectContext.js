import { FileProjectContext } from './FileProjectContext.js'
import { isNumber, toNumber } from './adapters/parsers/task/CardContentParser.js'

export class ProjectContext extends FileProjectContext {
  constructor(repo) {
    super()
    this.repo = repo
  }

  getOrder(list, order) {
    const config = this.repo.config
    if (config && config.keepEmptyPriority && order === undefined) return
    const tasks =
      list && this.repo.listExists(list) ? this.repo.getTasksInList(list) : []
    return this.determineOrder(config, order, tasks)
  }

  get config() {
    return this.repo.config
  }

  toJSON() {
    return null
  }

  determineOrder(config, order, tasks) {
    if (isNumber(order)) return toNumber(order)
      if (!config) return
    if (config.keepEmptyPriority) return
    if (tasks) {
      if (tasks.length == 0) {
        return 0
      } else if (config.isAddNewCardsToTop()) {
        return (isNumber(tasks[0].order) ? toNumber(tasks[0].order) : 0) - 10
      } else {
        const lastTask = tasks[tasks.length - 1]
        return (lastTask && isNumber(lastTask.order) ? lastTask.order : 0) + 10
      }
    }
    return 0
  }
  
}
