import Plugin from 'imdone-api'
import _path from 'path'
import { exists } from '../adapters/file-gateway.js'

export default class ExtensionPlugin extends Plugin {
  constructor(project) {
    super(project)
    console.log('loading extensions')
    this.configDir = _path.join(project.path, '.imdone')
  }

  async init() {
    this.cardActionsFunction = await this.loadExtensionModule(
      () => [],
      'actions',
      'card'
    )
    this.boardActionsFunction = await this.loadExtensionModule(
      () => [],
      'actions',
      'board'
    )
    this.cardPropertiesFunction = await this.loadExtensionModule(
      () => {
        return {}
      },
      'properties',
      'card'
    )
    this.boardPropertiesFunction = await this.loadExtensionModule(
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

  async loadExtensionModule(_default, ...path) {
    let extension = _default
    const extensionPath = this.getConfigPath(path)
    try {
      await exists(extensionPath + '.js')
      delete require.cache[require.resolve(extensionPath)]
      extension = await import(extensionPath)
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('No extension found at:', extensionPath)
      } else {
        console.warn(e)
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
