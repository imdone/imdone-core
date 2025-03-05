const Repository = require('./repository')
const watchedFsStore = require('./mixins/repo-watched-fs-store')
const fsStore = require('./mixins/repo-fs-store')
const ProjectContext = require('./ProjectContext')
const Project = require('./project')
const context = require('./context/ApplicationContext')

function createFileSystemProject({
    path,
    config,
    repo = fsStore(new Repository(path, config)),
    loadInstalledPlugins,
    loadPluginsNotInstalled
}) {
    context().repo = repo
    context().projectContext = new ProjectContext(repo)
    context().project = new Project(repo)
    if (loadInstalledPlugins) {
        context().project.pluginManager.loadInstalledPlugins = loadInstalledPlugins
    }
    if (loadPluginsNotInstalled) {
        context().project.pluginManager.loadPluginsNotInstalled = loadPluginsNotInstalled
    }
    return context().project
}

module.exports = {
    createWatchedFileSystemProject: function({
        path,
        config,
        repo = watchedFsStore(new Repository(path, config)),
        loadInstalledPlugins,
        loadPluginsNotInstalled    
    }) {
        return createFileSystemProject({
            path,
            config,
            repo,
            loadInstalledPlugins,
            loadPluginsNotInstalled        
        })
    },

    createFileSystemProject
}