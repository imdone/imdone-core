import Repository from './repository'
import watchedFsStore from './mixins/repo-watched-fs-store'
import fsStore from './mixins/repo-fs-store'
import { ProjectContext } from './ProjectContext'
import Project from './project'
import context from './context/ApplicationContext'

export function createFileSystemProject({
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

export function createWatchedFileSystemProject({
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
}