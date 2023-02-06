const ApplicationContext = require('../../context/ApplicationContext')
const ProjectReader = require('./ProjectReader')
const ProjectPresenter = require('./ProjectPresenter')

module.exports = class OpenProjectUsecase {
  constructor() {
    this.projectReader = ApplicationContext.projectReader
    this.projectPresenter = ApplicationContext.projectPresenter
  }

  execute(location) {
    const project = this.projectReader.read(location)
    this.projectPresenter.present(project)
  }
}
