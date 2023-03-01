const Repository = require('./repository')
const watchedFsStore = require('./mixins/repo-watched-fs-store')
const ProjectContext = require('./ProjectContext')
const Project = require('./project')
const context = require('./context/ApplicationContext')

module.exports = {
    createWatchedFileSystemProject: (path) => {
        const repo = watchedFsStore(new Repository(path))
        context().repo = repo
        context().projectContext = new ProjectContext(repo)
        context().project = new Project(repo)
        return context().project
    }
}