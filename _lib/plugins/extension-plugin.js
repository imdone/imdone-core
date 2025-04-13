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
    )
    this.boardActionsFunction = this.loadExtensionModule(
      () => [],
      'actions',
      'board'
    )
    this.cardPropertiesFunction = this.loadExtensionModule(
      () => {
        return {}
      },
      'properties',
      'card'
    )
    this.boardPropertiesFunction = this.loadExtensionModule(
      () => {
        return {}
      },
      'properties',
      'board'
    )
  }

  getCardProperties(task) {
    return this.cardPropertiesFunction(task)
  }

  async getBoardProperties() {
    return await this.boardPropertiesFunction()
  }

  getCardActions(task) {
    return this.cardActionsFunction(task)
  }

  getBoardActions() {
    return this.boardActionsFunction().map(({ title, action, keys, icon }) => ({
      title,
      name: title,
      action,
      keys,
      icon
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
      if (e.code === 'ENOENT') {
        console.log('No extension found at:', extensionPath)
      } else {
        console.error(e)
      }
    }

    if (typeof extension !== 'function') {
      console.warn(
        `${extensionPath} does not export a function. Using default empty function. ${_default.toString()}`
      )
      extension = _default
    }

    return extension
  }
}
