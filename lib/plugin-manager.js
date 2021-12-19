const EpicPlugin = require('./epic-plugin')
const Plugin = require('imdone-api')
const fs = require('fs')
const _path = require('path')

module.exports = class PluginManager {
  constructor (repo) {
    this.repo = repo
    this.plugins = []
    this.pluginsMap = {}
    this.pluginPath = _path.join(repo.path, '.imdone', 'plugins')
    this.loadPlugins()
  }

  loadPlugins () {
    this.plugins = [EpicPlugin]
    this.exists(this.pluginPath)
      .then(path => {
        if (!path) return this.createPlugins()
        fs.readdir(this.pluginPath, {withFileTypes: true}, (err, paths) => {
          if (err) throw err
          paths.filter(entry => entry.isDirectory())
            .map(entry => _path.join(this.pluginPath, entry.name))
            .forEach(path => {
              try {
                // eslint-disable-next-line
                delete require.cache[require.resolve(path)]
                // eslint-disable-next-line
                const pluginClass = require(path)
                if (!this.isPlugin(pluginClass)) throw new Error(`${path} is not a plugin`)
                this.plugins.push(pluginClass)
              } catch (e) {
                console.error(`Error loading plugin at: ${path}`,e)
              }
            })
          this.createPlugins()
        })
      })
  }

  createPlugins () {
    this.pluginsMap = {}
    this.plugins.forEach(pluginClass => {
      let pluginInstance = null
      try {
        pluginInstance = new pluginClass(this.repo.project)
        this.pluginsMap[pluginClass.name.toString()] = pluginInstance
      } catch (e) {
        console.error(`Plugin ${pluginClass} constructor threw an error.`)
        return
      }
    })
  }

  destroyPlugins () {
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
