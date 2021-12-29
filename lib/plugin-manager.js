const EpicPlugin = require('./epic-plugin')
const Emitter = require('events')
const Plugin = require('imdone-api')
const fs = require('fs')
const _path = require('path')
const npminstall = require('npminstall')
const sane = require('sane')
const debounce = require('lodash.debounce')

module.exports = class PluginManager extends Emitter {
  constructor (project) {
    super()
    this.project = project
    this.defaultPlugins = [EpicPlugin]
    this.pluginsMap = {}
    this.pluginPath = _path.join(project.path, '.imdone', 'plugins')
    this.onDevChange = debounce(this.onDevChange.bind(this),1000);
    this.loadPlugins()
  }

  startDevMode () {
    if (this.project.config.devMode && !this.watcher) {
      this.watcher = sane(this.pluginPath, {
        ignored (path) {
          return /node_modules/.test(path)
        }
      })
      this.watcher.on('change', (path, root, stat) => {
        console.log('Plugin changed:', path)
        this.onDevChange()
      })
      this.watcher.on('add', (path, root, stat) => {
        console.log('Plugin add:', path)
        this.onDevChange()
      })
    }
  }

  stopDevMode () {
    this.watcher && this.watcher.close()
    this.watcher = null;
  }

  initDevMode () {
    if (!this.project.config.devMode) this.stopDevMode()
    this.startDevMode()
  }

  onDevChange () {
    this.destroyPlugins()
    this.loadPlugins()
    this.startDevMode()
    this.emit('plugins-reloaded')
  }

  installPlugin ({name, version}) {
    return new Promise((resolve, reject) => {
      this.exists(this.pluginPath)
      .catch(reject)
      .then(path => {
        if (!path) fs.mkdirSync(this.pluginPath)
        const nodeModules = _path.join(this.pluginPath, 'node_modules')
        const linkPath = _path.join(nodeModules, name)
        const installPath = _path.join(this.pluginPath, name)
        npminstall({
          root: this.pluginPath,
          flatten: true,
          pkgs: [
            { 
              name,
              version
            }
          ]
        })
        .catch(reject)
        .then(data => {
          console.log(`Done installing ${name}`, data)
          fs.promises.readlink(linkPath)
          .catch(reject)
          .then(path => {
            fs.promises.symlink(_path.join(nodeModules, path), installPath, 'dir')
            .catch(reject)
            .then(() => {
              this.loadPlugin(installPath)
              this.emit('plugin-installed', {name, version})
            })
          })
        })
      })
    })
  }

  loadPlugins () {
    this.defaultPlugins.forEach(pluginClass => this.createPlugin(pluginClass))

    this.exists(this.pluginPath)
    .then(path => {
      if (!path) return
      fs.readdir(this.pluginPath, {withFileTypes: true}, (err, paths) => {
        if (err) throw err
        paths.filter(entry => entry.name !== 'node_modules' && (entry.isDirectory() || entry.isSymbolicLink()))
        .map(entry => _path.join(this.pluginPath, entry.name))
        .forEach(path => {
          this.loadPlugin(path)
        })
      })
    })
  }

  loadPlugin (path) {
    console.log('Loading plugin: ', path)
    try {
      // eslint-disable-next-line
      delete require.cache[require.resolve(path)]
      // eslint-disable-next-line
      const pluginClass = require(path)
      this.createPlugin(pluginClass)
    } catch (e) {
      console.error(`Error loading plugin at: ${path}`,e)
    }
  }

  createPlugin (pluginClass) {
    if (!this.isPlugin(pluginClass)) throw new Error(`${path} is not a plugin`)
    const pluginInstance = new pluginClass(this.project)
    this.pluginsMap[pluginClass.name.toString()] = pluginInstance
  }

  destroyPlugins () {
    this.stopDevMode()
    this.eachPlugin(plugin => {
      try {
        plugin.destroy()
      } catch (e) {
        this.pluginError('destroy', plugin, e)
      }
    })
  }

  isPlugin (pluginClass) {
    return Object.getPrototypeOf(pluginClass).name === Plugin.name
  }

  updateLists (lists) {
    if (!lists || lists.length == 0) return
    this.eachPlugin(plugin => {
      try {
        plugin.onListsChange(lists)
      } catch (e) {
        this.pluginError('onListsChange', plugin, e)
      }
    })
    return lists
  }

  eachPlugin (cb) {
    Object.keys(this.pluginsMap).forEach(key => {
      cb(this.pluginsMap[key])
    })
  }

  getPluginName (pluginInstance) {
    return Object.keys(this.pluginsMap).find(pluginName => this.pluginsMap[pluginName] === pluginInstance)
  }

  getPlugin (name) {
    return this.pluginsMap[name]
  }

  pluginError (method, plugin, error) {
    console.error(`Plugin: ${this.getPluginName(plugin)} threw an error on ${method}: `, error)
  }

  getCardProperties (props) {
    let cardProps = {}
    this.eachPlugin(plugin => {
      try {
        cardProps = {...cardProps, ...plugin.getCardProperties(props)}
      } catch (e) {
        this.pluginError('getCardProperties', plugin, e)
      }
    })
    return cardProps
  }

  getCardLinks (task) {
    let cardLinks = []
    this.eachPlugin(plugin => {
      try {
        cardLinks = [
          ...cardLinks,
          ...plugin.getCardLinks(task).map((link, index) => {
            return {...link, action: {plugin: this.getPluginName(plugin), index}}
          })
        ]
      } catch (e) {
        this.pluginError('getCardLinks', plugin, e)
      }
    })
    return cardLinks
  }

  getBoardActions () {
    let actions = []
    this.eachPlugin(plugin => {
      try {
        actions = [
          ...actions,
          ...plugin.getBoardActions().map((item, index) => {
            return {...item, plugin: this.getPluginName(plugin), index}
          })
        ]
      } catch (e) {
        this.pluginError('getBoardActions', plugin, e)
      }
    })
    return actions
  }

  async exists (path) {  
    try {
      await fs.promises.access(path)
      return path
    } catch {
      return false
    }
  }

  performCardAction (action, task) {
    const plugin = this.getPlugin(action.plugin)
    try {
      plugin.getCardLinks(task)[action.index].action()
    } catch (e) {
      this.pluginError('getCardLinks', plugin, e)
    }
  }

  performBoardAction (action) {
    const plugin = this.getPlugin(action.plugin)
    try {
      plugin.getBoardActions()[action.index].action()
    } catch (e) {
      this.pluginError('getBoardActions', plugin, e)
    }
  }

}
