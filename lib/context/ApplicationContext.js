const Config = require('../config')

const context = {
  project: null,
  repo: null,
  projectContext: null,
  projectReader: null,
  projectPresenter: null,
  config: Config.newDefaultConfig()
}

module.exports = () => context