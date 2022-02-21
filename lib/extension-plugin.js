const Plugin = require('imdone-api')
const _path = require('path')

module.exports = class ExtensionPlugin extends Plugin {
  constructor(project) {
    super(project)
    console.log('loading extensions')
    this.configDir = _path.join(project.path, '.imdone')

    this.cardActionsFunction = this.loadExtensionModule(
      () => [],
      'actions',
      'card'
    )
    this.boardActionsFunction = this.loadExtensionModule(
      () => [],
      'actions',
      'board'
    )
    this.cardPropertiesFunction = this.loadExtensionModule(
      () => ({}),
      'properties',
      'card'
    )
  }

  getCardProperties(task) {
    return this.cardPropertiesFunction(task)
  }

  getCardActions(task) {
    return this.cardActionsFunction(this.project, task)
  }

  getBoardActions() {
    return this.boardActionsFunction(this.project).map(({ title, action }) => ({
      name: title,
      action,
    }))
  }

  getConfigPath(relativePath) {
    return _path.join(this.configDir, ...relativePath)
  }

  loadExtensionModule(_default, ...path) {
    let extension = _default
    const extensionPath = this.getConfigPath(path)
    try {
      delete require.cache[require.resolve(extensionPath)]
      extension = require(extensionPath)
    } catch (e) {
      console.error(e)
      console.log('No extension found at:', extensionPath)
    }
    return extension
  }
}
