import Plugin from 'imdone-api'
import path from 'path'
import { getRawTask } from '../adapters/parsers/task/CardContentParser.js'

export default class ArchivePlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  get config() {
    return this.project.config
  }

  get fileGateway() {
    return this.project.fileGateway
  }

  async onBeforeBoardUpdate() {
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

    for (const card of cards) {
      await this.archiveTask(card)
    }

    if (messageUser) this.project.snackBar({message: ` Done archiving ${cards.length} card(s). Deleting original(s)...`})
    await this.project.deleteTasks(cards)

    this.archivingTasks = false
    if (messageUser) this.project.snackBar({message: `Done deleting original card(s).`})

  }

  async archiveTask (task, config = this.config) {
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

    const { tokenPrefix } = config
    const { beforeText, list } = task
    const taskStart = getRawTask({tokenPrefix, beforeText, list, text: ''})
    const taskContent = `${taskStart} ${content}\n\n\n`
    
    await this.fileGateway.preparePathForWriting(newPath)
    await this.fileGateway.appendFileSync(newPath, taskContent)
  }

}