import Plugin from 'imdone-api'
import _path from 'path'
import { exists } from '../adapters/file-gateway.js'
// import { createRequire } from 'node:module';
import { logger } from '../adapters/logger.js';
import { URL } from 'node:url';
// const require = createRequire(new URL(import.meta.url));

export default class ExtensionPlugin extends Plugin {
  constructor(project) {
    super(project)
    logger.log('loading extensions')
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

  getExtensionPath(relativePath) {
    return _path.resolve(_path.join(this.configDir, ...relativePath) + '.js')
  }

  async loadExtensionModule(_default, ...path) {
    let extension = _default
    const extensionPath = this.getExtensionPath(path)
    try {
      await exists(extensionPath)
      // delete require.cache[extensionPath]
      extension = await import(extensionPath)
    } catch (e) {
      if (e.code === 'ENOENT') {
        logger.log('No extension found at:', extensionPath)
      } else {
        logger.warn('Error loading extension:', e.message)
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
