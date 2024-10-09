const Plugin = require('imdone-api')
const path = require('path')

module.exports = class ArchivePlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  get config() {
    return this.project.config
  }

  get fileGateway() {
    return this.project.fileGateway
  }

  onTaskUpdate(task) {
    if (this.taskShouldBeArchived(task)) {
      this.archiveTask(task)
    }
  }

  taskShouldBeArchived (task, config = this.config) {
    return !task.meta.archived && config && config.archiveCompleted && task.list === config.doneList
  }

  // Create a new method in File that will move completed tasks to a file in the archive directory. Draw a mermaid diagram to show the flow of the method. Move the archived task to a new file in the archive directory. The archive directory is defined in config.settings.archiveFolder. The new file should be named with the first line of the task (the task.text) and it should be a markdown file. The task should be removed from the file it was in. The new file should be created if it doesn't exist. If the task is not completed, the method should return the task. If the task is completed, the method should return the new file path.
  archiveTask (task, config = this.config) {
    const archiveFolder = config.archiveFolder
    const fileDir = path.dirname(task.relPath)
    
    if (fileDir.startsWith(archiveFolder)) return

    const fileName = this.fileGateway.sanitizeFileName(`${task.text}.md`, config.replaceSpacesWith)
    const newPath = path.join(this.project.path, archiveFolder, fileDir, fileName)
    
    const taskId = task.id

    this.project.addMetadata(task, 'archived', 'true')
    .then((file) => {
      const task = file.getTask(taskId)
      const taskContent = `#${task.list} ${task.content}`
  
      this.fileGateway.preparePathForWriting(newPath)
      this.fileGateway.writeFileSync(newPath, taskContent)
  
      this.project.deleteTask(task)
    })
    .catch((err) => {
      console.log('Exception adding archived meta', err)
    })
  }

}