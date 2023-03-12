const Repository = require('./repository')
const watchedFsStore = require('./mixins/repo-watched-fs-store')
const fsStore = require('./mixins/repo-fs-store')
const ProjectContext = require('./ProjectContext')
const Project = require('./project')
const context = require('./context/ApplicationContext')

module.exports = {
    createWatchedFileSystemProject: function(path) {
        const repo = watchedFsStore(new Repository(path))
        context().repo = repo
        context().projectContext = new ProjectContext(repo)
        context().project = new Project(repo)
        return context().project
    },

    createFileSystemProject: function (path) {
        const repo = fsStore(new Repository(path))
        context().repo = repo
        context().projectContext = new ProjectContext(repo)
        context().project = new Project(repo)
        return context().project
    }
}