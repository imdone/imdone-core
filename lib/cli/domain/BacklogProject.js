const { createFileSystemProject } = require('../../project-factory')
const { resolve } = path = require('path')

module.exports = class BacklogProject {
  constructor(projectPath, config, ApplicationContext = require('./adapters/ApplicationContext')) {
    this.ApplicationContext = ApplicationContext
    this.projectPath = resolve(projectPath)
    this.config = config
    this.project = null
  }

  get path() {
    return this.projectPath
  }

  async init() {
    this.project = createFileSystemProject({path: this.projectPath, config: this.config})
    await this.project.init()
    return this
  }

  sanitizeFileName(text) {
    return this.project.sanitizeFileName(text)
  }

  removeList(list) {
    return this.project.removeList(list)
  }
}