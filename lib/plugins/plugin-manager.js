import Emitter from 'events'
import Plugin from 'imdone-api'
import _path from 'path'
import { downloadPlugin } from '../adapters/git-download.js'
import rimraf from 'rimraf'
import chokidar from 'chokidar'
import debounce from 'lodash.debounce'
import { exists, mkdir, readdir } from '../adapters/file-gateway.js'
import { appContext } from '../context/ApplicationContext.js'
import { createRequire } from 'node:module';

import PersistTagsPlugin from './persist-tags-plugin.js'
import DefaultBoardPropertiesPlugin from './default-board-properties-plugin.js'
import DefaultBoardActionsPlugin from './default-board-actions-plugin.js'
import ArchivePlugin from './archive-plugin.js'
import EpicPlugin from './epic-plugin.js'
import ExtensionPlugin from './extension-plugin.js'

const require = createRequire(import.meta.url);
const url = new URL(import.meta.url)
const __dirname = _path.dirname(url.pathname)

export class PluginManager extends Emitter {
  constructor(project) {
    super()
    this.project = project
    this.defaultPlugins = [
      PersistTagsPlugin,
      DefaultBoardPropertiesPlugin,
      DefaultBoardActionsPlugin,
      ArchivePlugin,
      EpicPlugin,
      ExtensionPlugin,
    ]

    this.pluginsMap = {}
    this.pluginPath = _path.join(project.path, '.imdone', 'plugins')
    this.onDevChange = debounce(this.onDevChange.bind(this), 1000)
  }

  async startDevMode() {
    if (this.project && this.project.config.devMode && !this.watcher) {
      if (!(await exists(this.pluginPath)))
        await mkdir(this.pluginPath)
      this.watcher = chokidar(this.pluginPath, {
        ignored(path) {
          return /node_modules/.test(path)
        },
      })
      this.watcher.on('change', (path, root, stat) => {
        this.onDevChange()
      })
      this.watcher.on('add', (path, root, stat) => {
        this.onDevChange()
      })
    }
  }

  stopDevMode() {
    this.watcher && this.watcher.close()
    this.watcher = null
  }

  initDevMode() {
    if (!this.project.config.devMode) this.stopDevMode()
    this.startDevMode()
  }

  async onDevChange() {
    try {
      await this.reloadPlugins()
      this.emit('plugins-reloaded')
    } catch {
      console.error('Error reloading plugins.', err)
      throw err
    }
  }

  async reloadPlugins() {
    this.destroyPlugins()
    await this.loadPlugins()
    await this.startDevMode()
  }

  async uninstallPlugin(pluginName) {
    return new Promise((resolve, reject) => {
      console.log('Preparing to uninstall plugin:', pluginName)
      const pluginClassName = Object.keys(this.pluginsMap).find((key) => {
        return this.getPlugin(key).info.name === pluginName
      })
      if (!pluginClassName) {
        return reject(new Error('Unable to find plugin:' + pluginName))
      }
      const { info } = this.getPlugin(pluginClassName)
      const { path } = info
      // const pkg = { version, name }
      console.log('Uninstalling:', info)

      rimraf(path, (err) => {
        if (err) return reject(err)
        delete this.pluginsMap[pluginClassName]
        this.emit('plugin-uninstalled', pluginName)
        resolve()
      })
    })
  }

  async installPlugin({ name, version }) {
    if (!(await exists(this.pluginPath)))
      await mkdir(this.pluginPath)
    const installPath = _path.join(this.pluginPath, name)
    await downloadPlugin(version, installPath)
    console.log(`Done installing ${name}`)
    await this.loadPlugin(installPath)
    this.emit('plugin-installed', name)
  }

  async loadPlugins() {
    for (const PluginClass of this.defaultPlugins) {
      await this.createPlugin(PluginClass)
    }

    await this.loadInstalledPlugins()
    await this.loadPluginsNotInstalled()
  }

  async loadInstalledPlugins() {
    const path = await exists(this.pluginPath)
    if (!path) {
      await mkdir(this.pluginPath)
    }
    const paths = await readdir(this.pluginPath, { withFileTypes: true })
    const pluginPaths = paths
    .filter(
      (entry) =>
        entry.name !== 'node_modules' &&
        (entry.isDirectory() || entry.isSymbolicLink())
    )
    .map((entry) => _path.join(this.pluginPath, entry.name))
    
    for (const path of pluginPaths) {
      await this.loadPlugin(path)
    }
  }
  
  async loadPluginsNotInstalled() {
    const availablePlugins = await appContext().pluginRegistry.getAvailablePlugins()
    const configPluginNames = Object.keys(this.project.config.plugins)
    if (!configPluginNames) return
    const installedPluginNames = Object.keys(this.pluginsMap)
    const pluginsNotInstalled = configPluginNames.filter(name => !installedPluginNames.includes(name))
    for (const pluginName of pluginsNotInstalled) {
      const plugin = availablePlugins.find(p => p.name === pluginName)
      if (plugin && plugin.name) await this.installPlugin(plugin)
    }
  }

  async loadPlugin(path) {
    console.log('Loading plugin: ', path)
    const fullPath = path.endsWith('.js') 
      ? _path.resolve(path) 
      : _path.join(_path.resolve(path), 'bundle.js')

    try {
      // eslint-disable-next-line
      delete require.cache[require.resolve(fullPath)]
      // eslint-disable-next-line
      const pluginClass = await import(_path.resolve(path))
      const pluginInstance = await this.createPlugin(pluginClass.default, path)
      return pluginInstance
    } catch (e) {
      console.error(`Error loading plugin at: ${path}`, e)
    }
  }

  getPackageInfo(path) {
    if (!path) return {}
    let info = { path }
    try {
      info = {...info, ...require(`${path}/package.json`) }
      delete info.dependencies
      delete info.devDependencies
      delete info.scripts
      delete info.main
    } catch (e) {
      console.info('No info on plugin:', path)
    }
  }
  
  async createPlugin(pluginClass, path = undefined) {
    if (!this.isPlugin(pluginClass))
      throw new Error(`${pluginClass.name} is not a plugin`)
    const name = pluginClass.name.toString()
    const pluginInstance = new pluginClass(this.project)
    let info = {
      name,
      ...this.getPackageInfo(path),
    }

    pluginInstance.getSettings = () => {
      return this.getPluginSettings(name)
    }
    
    this.pluginsMap[name] = {
      pluginInstance,
      pluginClass,
      info,
    }

    if (pluginInstance.init) await pluginInstance.init()

    return pluginInstance
  }

  destroyPlugins() {
    this.stopDevMode()
    this.eachPlugin(({ pluginInstance }) => {
      try {
        pluginInstance.destroy()
      } catch (e) {
        this.pluginError('destroy', pluginInstance, e)
      }
    })
  }

  isPlugin(pluginClass) {
    // const pluginClassName = Plugin.name.toString()
    // return pluginClass.proname.toString() === pluginClassName
    const pluginClassPrototypeName = Object.getPrototypeOf(pluginClass.prototype).constructor.name
    const pluginClassName = Plugin.name.toString()
    console.log('pluginClassPrototypeName', pluginClassPrototypeName)
    console.log('pluginClassName', pluginClassName)
    return pluginClassPrototypeName === pluginClassName
   
    // return Object.getPrototypeOf(pluginClass.prototype) === Plugin.prototype
  }

  eachPlugin(cb) {
    Object.keys(this.pluginsMap).forEach((key) => {
      cb(this.getPlugin(key))
    })
  }

  async eachPluginAsync(cb) {
    for (const key of Object.keys(this.pluginsMap)) {
      await cb(this.getPlugin(key))
    }
  }

  getPlugins() {
    return Object.keys(this.pluginsMap).map((key) => {
      const { info, pluginInstance } = this.getPlugin(key)
      const schema = pluginInstance.getSettingsSchema()
      if (schema) {
        schema.id = info.name
        schema.title = `${info.name} settings`
      }
      return { ...info, schema }
    })
  }

  disablePlugin(name) {
    delete this.pluginsMap[name]
  }

  getPluginName(pluginInstance) {
    return Object.keys(this.pluginsMap).find(
      (pluginName) =>
        this.getPlugin(pluginName).pluginInstance === pluginInstance
    )
  }

  getPluginInstance(name) {
    const plugin = this.getPlugin(name)
    if (!plugin) throw new Error(`Plugin ${name} not found`)
    return plugin.pluginInstance
  }

  getPlugin(name) {
    return this.pluginsMap[name]
  }

  getPluginSettings(name) {
    return this.project.config.plugins[name] || {}
  }

  pluginError(method, pluginInstance, error) {
    console.warn(
      `Plugin: ${this.getPluginName(
        pluginInstance
      )} threw an error on ${method}: `,
      error
    )
  }

  async onBoardUpdate(lists) {
    if (!lists || lists.length == 0) return
    await this.eachPluginAsync(async ({ pluginInstance }) => {
      // const timeLabel = `${this.getPluginName(pluginInstance)} onBoardUpdate time`
      // console.time(timeLabel)
      try {
        await pluginInstance.onBoardUpdate(lists)
      } catch (e) {
        this.pluginError('onBoardUpdate', pluginInstance, e)
      }
      // console.timeEnd(timeLabel)
    })
    return lists
  }

  async onBeforeBoardUpdate() {
    await this.eachPluginAsync(async ({ pluginInstance }) => {
      try {
        await pluginInstance.onBeforeBoardUpdate()
      } catch (e) {
        this.pluginError('onBeforeBoardUpdate', pluginInstance, e)
      }
    })
  }

  onTaskUpdate(task) {
    this.eachPlugin(({ pluginInstance }) => {
      try {
        pluginInstance.onTaskUpdate(task)
      } catch (e) {
        this.pluginError('onTaskUpdate', pluginInstance, e)
      }
    })
  }

  async onTaskFound(task) {
    await this.eachPluginAsync(async ({ pluginInstance }) => {
      try {
        if (pluginInstance.onTaskFound) await pluginInstance.onTaskFound(task)
      } catch (e) {
        this.pluginError('onTaskFound', pluginInstance, e)
      }
    })
  }

  async onBeforeAddTask({path, list, content, tags, contexts, meta, useCardTemplate}) {
    await this.eachPluginAsync(async ({ pluginInstance }) => {
      try {
        const pluginMods = await pluginInstance.onBeforeAddTask({path, list, content, tags, contexts, meta, useCardTemplate})
        path = pluginMods.path
        content = pluginMods.content
        tags = pluginMods.tags
        contexts = pluginMods.contexts
        meta = pluginMods.meta
      } catch (e) {
        this.pluginError('onBeforeAddTask', pluginInstance, e)
      }
    })
    return {path, content, tags, contexts, meta}
  }

  async onAfterDeleteTask(task) {
    await this.eachPluginAsync(async ({ pluginInstance }) => {
      try {
        await pluginInstance.onAfterDeleteTask(task)
      } catch (e) {
        this.pluginError('onAfterDeleteTask', pluginInstance, e)
      }
    })
  }

  getCardProperties(props) {
    let cardProps = {}
    this.eachPlugin(({ pluginInstance }) => {
      try {
        cardProps = { ...cardProps, ...pluginInstance.getCardProperties(props) }
      } catch (e) {
        this.pluginError('getCardProperties', pluginInstance, e)
      }
    })
    return cardProps
  }


  async getBoardProperties() {
    let boardProps = {}
    await this.eachPluginAsync(async ({ pluginInstance }) => {
      try {
        const pluginProps = pluginInstance.getBoardProperties ? await pluginInstance.getBoardProperties() : {}
        boardProps = { ...boardProps, ...pluginProps }
      } catch (e) {
        this.pluginError('getBoardProperties', pluginInstance, e)
      }
    })
    return boardProps
  }

  getCardActions(task) {
    let cardLinks = []
    this.eachPlugin(({ pluginInstance }) => {
      try {
        cardLinks = [
          ...cardLinks,
          ...pluginInstance.getCardActions(task).map((link, index) => {
            return {
              ...link,
              action: { plugin: this.getPluginName(pluginInstance), index },
            }
          }),
        ]
      } catch (e) {
        this.pluginError('getCardActions', pluginInstance, e)
      }
    })
    return cardLinks
  }

  getBoardActions() {
    let actions = []
    this.eachPlugin(({ pluginInstance }) => {
      try {
        actions = [
          ...actions,
          ...pluginInstance.getBoardActions().map((item, index) => {
            if (item.title) item.name = item.title
            return {
              ...item,
              plugin: this.getPluginName(pluginInstance),
              index,
            }
          }),
        ]
      } catch (e) {
        this.pluginError('getBoardActions', pluginInstance, e)
      }
    })
    return actions
  }

  performCardAction(action, task) {
    const plugin = this.getPluginInstance(action.plugin)
    try {
      return plugin.getCardActions(task)[action.index].action()
    } catch (e) {
      this.pluginError('getCardActions', plugin, e)
    }
  }

  async performBoardAction(action, task) {
    const plugin = this.getPluginInstance(action.plugin)
    try {
      return action.index 
      ? await plugin.getBoardActions()[action.index].action(task)
      : await plugin.getBoardActions().find(a => a.title === action.title).action(task)
    } catch (e) {
      this.pluginError('getBoardActions', plugin, e)
    }
  }
}
