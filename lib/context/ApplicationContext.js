const Config = require('../config')

class ApplicationContext {
  constructor({
    project,
    repo,
    projectContext,
    projectReader,
    projectPresenter,
  }) {
    this.project = project;
    this.repo = repo;
    this.projectContext = projectContext;
    this.projectReader = projectReader;
    this.projectPresenter = projectPresenter;
    this.innerConfig = Config.newDefaultConfig()
  }

  set config(config) {
    this.innerConfig = config 
    this.repo && (this.repo.config = config)
  }

  get config() {
    return (this.repo && this.repo.config) || this.innerConfig
  }

}
const context = new ApplicationContext({})

module.exports = () => context