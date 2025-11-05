import Plugin from 'imdone-api'
import _path from 'path'
import { exists } from '../adapters/file-gateway.js'
import { logger } from '../adapters/logger.js';

export default class ExtensionPlugin extends Plugin {
  constructor(project) {
    super(project)
    logger.log('loading extensions')
    this.configDir = _path.join(project.path, '.imdone')
  }

  static get pluginName() {
    return 'ExtensionPlugin'
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

  getExtensionPath(relativePath) {
    return _path.resolve(_path.join(this.configDir, ...relativePath) + '.js')
  }

  async loadExtensionModule(_default, ...path) {
  let extension = _default
  const extensionPath = this.getExtensionPath(path)
  try {
    await exists(extensionPath)
    const importedModule = await import(extensionPath)
    
    // Check if it's a module object with a default export
    if (importedModule && typeof importedModule === 'object' && 'default' in importedModule) {
      extension = importedModule.default
    } else {
      extension = importedModule
    }
  } catch (e) {
    if (['ENOENT', 'ERR_MODULE_NOT_FOUND'].includes(e.code)) {
      logger.log('No extension found at:', extensionPath)
    } else {
      logger.warn(`Error loading extension with error code ${e.code}`, e.message)
    }
  }

  if (typeof extension !== 'function') {
    logger.warn(
      `${extensionPath} does not export a function. Using default empty function. ${_default.toString()}`
    )
    extension = _default
  }

  return extension
  }
}
