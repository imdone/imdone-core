const appContext = require('../../context/ApplicationContext')

module.exports = class OpenProjectUsecase {
  constructor() {
    this.projectReader = appContext().projectReader
    this.projectPresenter = appContext().projectPresenter
  }

  execute(location) {
    const project = this.projectReader.read(location)
    this.projectPresenter.present(project)
  }
}
