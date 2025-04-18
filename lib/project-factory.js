import { Repository } from './repository.js'
import { watchedFileSystemStoreMixin } from './mixins/repo-watched-fs-store.js'
import { fileSystemStoreMixin } from './mixins/repo-fs-store.js'
import { ProjectContext } from './ProjectContext.js'
import { WorkerProject } from './project.js'
import { appContext as context } from './context/ApplicationContext.js'
import _path from 'node:path'

export function createFileSystemProject({
    path,
    config,
    repo = fileSystemStoreMixin(new Repository(_path.resolve(path), config)),
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
    repo = watchedFileSystemStoreMixin(new Repository(_path.resolve(path), config)),
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