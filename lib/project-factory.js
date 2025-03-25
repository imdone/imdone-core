import { Repository } from './repository.js'
import watchedFsStore from './mixins/repo-watched-fs-store.js'
import fsStore from './mixins/repo-fs-store.js'
import { ProjectContext } from './ProjectContext.js'
import { WorkerProject } from './project.js'
import context from './context/ApplicationContext.js'

export function createFileSystemProject({
    path,
    config,
    repo = fsStore(new Repository(path, config)),
    loadInstalledPlugins,
    loadPluginsNotInstalled
}) {
    context().repo = repo
    context().projectContext = new ProjectContext(repo)
    context().project = new WorkerProject(repo)
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