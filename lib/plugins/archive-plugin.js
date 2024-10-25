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

  onBeforeBoardUpdate() {
    const config = this.config
    if (!config || !config.archiveCompleted || this.archivingTasks) return
    this.archivingTasks = true
    const cards = this.project.getAllCards(`meta.archived != "true" and list = ${config.doneList}`)
    const messageUser = cards.length > 1
    if (!cards.length) {
      this.archivingTasks = false
      return
    } else {
      if (messageUser) this.project.snackBar({message: `Archiving ${cards.length} card(s)...`})
    }
    cards.forEach(card => this.archiveTask(card))
    if (messageUser) this.project.snackBar({message: ` Done archiving ${cards.length} card(s). Deleting original(s)...`})
    this.project.deleteTasks(cards).then(() => {
      this.archivingTasks = false
      if (messageUser) this.project.snackBar({message: `Done deleting original card(s).`})
    })
  }

  archiveTask (task, config = this.config) {
    const archiveFolder = config.archiveFolder
    const fileDir = path.dirname(task.relPath)
    
    if (fileDir.startsWith(archiveFolder)) return

    const fileName = this.fileGateway.sanitizeFileName(`${task.text}.md`, config.replaceSpacesWith)
    const newPath = path.join(this.project.path, archiveFolder, fileDir, fileName)
    
    const content = this.project.addMetaToContent(
      [
        { key: 'archived', value: 'true'},
        { key: 'archivedAt', value: this.project.isoDateWithOffset },
        { key: 'originalPath', value: task.relPath },
        { key: 'originalLine', value: task.line }
      ], 
      task.content
    )
    const taskContent = `${task.beforeText}${config.tokenPrefix}${task.list} ${content}\n\n\n`

    this.fileGateway.preparePathForWriting(newPath)
    this.fileGateway.appendFileSync(newPath, taskContent)
  }

}