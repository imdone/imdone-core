const Config = require('../config')

const context = {
  projectContext: null,
  projectReader: null,
  projectPresenter: null,
  config: Config.newDefaultConfig()
}

module.exports = () => context