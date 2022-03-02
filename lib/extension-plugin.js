const Plugin = require('imdone-api')
const _path = require('path')
const { statSync } = require('fs')

module.exports = class ExtensionPlugin extends Plugin {
  constructor(project) {
    super(project)
    console.log('loading extensions')
    this.configDir = _path.join(project.path, '.imdone')

    this.cardActionsFunction = this.loadExtensionModule(
      () => [],
      'actions',
      'card'
    ).bind(this)
    this.boardActionsFunction = this.loadExtensionModule(
      () => [],
      'actions',
      'board'
    ).bind(this)
    this.cardPropertiesFunction = this.loadExtensionModule(
      () => {
        return {}
      },
      'properties',
      'card'
    ).bind(this)
  }

  getCardProperties(task) {
    return this.cardPropertiesFunction(task)
  }

  getCardActions(task) {
    return this.cardActionsFunction(task)
  }

  getBoardActions() {
    return this.boardActionsFunction().map(({ title, action }) => ({
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
      statSync(extensionPath + '.js')
      delete require.cache[require.resolve(extensionPath)]
      extension = require(extensionPath)
    } catch (e) {
      console.log('No extension found at:', extensionPath)
    }
    return extension
  }
}