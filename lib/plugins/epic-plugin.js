import Plugin from 'imdone-api'
import { logger } from '../adapters/logger.js'

function getIsEpicMeta(task) {
  return task.allMeta && task.allMeta['is-epic'] && task.allMeta['is-epic'][0]
}

function getEpicMeta(task) {
  return task.allMeta && task.allMeta['epic'] && task.allMeta['epic'][0]
}

export default class EpicPlugin extends Plugin {
  constructor(project) {
    super(project)
    this.epics = {}
  }

  static get pluginName() {
    return 'EpicPlugin'
  }

  async onBeforeBoardUpdate() {
    this.epics = {}
  }

  onBoardUpdate(lists) {
    // this html is getting initialized before onBoardUpdate
    logger.log(
      `${this.project.name} epics found:`,
      Object.keys(this.epics).length
    )
    logger.time(`${this.project.name} Epic updates`)
    this.updateCardMD(lists)
    logger.timeEnd(`${this.project.name} Epic updates`)
  }

  onTaskUpdate(task) {
    const isEpicMeta = getIsEpicMeta(task)
    const epicMeta = getEpicMeta(task)
    if (!isEpicMeta && !epicMeta) return

    if (isEpicMeta && epicMeta) {
      delete task.allMeta.epic
      task.allMeta['is-epic'] = [epicMeta]
      this.addEpic(epicMeta, task)
    } else if (epicMeta) {
      this.addEpicItem(epicMeta, task)
    } else if (isEpicMeta) {
      this.addEpic(isEpicMeta, task)
    }
  }

  initEpic(name) {
    if (!this.epics[name]) {
      this.epics[name] = {
        items: {},
      }
    }
  }

  addEpic(name, task) {
    this.initEpic(name)
    this.epics[name].epic = task
  }

  addEpicItem(name, task) {
    const list = task.list
    this.initEpic(name)
    if (!this.getEpicItemsInList(name, list)) this.epics[name].items[list] = []
    if (this.getEpicItemsInList(name, list).find((t) => t.id === task.id)) return
    this.epics[name].items[list].push(task)
  }

  get epicNames() {
    return Object.keys(this.epics)
  }

  getEpic(name) {
    return this.epics[name].epic
  }

  getEpicItems(name) {
    return this.epics[name].items
  }

  getEpicItemsInList(name, list) {
    return this.epics[name].items[list]
  }


  getEpicLists(name) {
    return Object.keys(this.getEpicItems(name))
  }

  isListHidden(name, lists) {
    return lists.find((list) => list.name === name).hidden
  }

  isListIgnored(name, lists) {
    return lists.find((list) => list.name === name).ignore
  }

  updateCardMD(lists) {
    this.epicNames.forEach((epicId) => {
      const epic = this.getEpic(epicId)
      const epicLists = this.getEpicLists(epicId)
      if (!epic) return
      if (epicLists.length === 0) return
      if (
        epic.list === this.project.doneList &&
        (this.isListHidden(epic.list, lists) ||
          this.isListIgnored(epic.list, lists))
      ) {
        return
      }

      const epicText = epic.text // removeMD(epic.text)
      const epicFilter = encodeURIComponent(
        `(allMeta.epic="${epicId}" or allMeta.is-epic="${epicId}")`
      )
      const epicFilePath = encodeURI(
        `${epic.source.repoId}/${epic.source.path}`.replace(/\\/g, '/')
      )
      const epicUrl = `imdone://${epicFilePath}?line=${epic.line}&filter=${epicFilter}`
      const epicLink = `**Epic:** [${epicText}](${epicUrl})\n\n`

      // Add epic link to epic tasks
      epicLists.forEach((list) => {
        this.getEpicItemsInList(epicId, list).forEach((task) => {
          task.interpretedContent = epicLink + task.interpretedContent
          task.init()
        })
      })

      const taskList =
        epicLists.length === 0
          ? '*None*\n'
          : '\n<div class="imdone-epic-items">\n\n' +
            this.getTaskListMD(lists, epicFilter, epicUrl, epicId) +
            '\n\n</div>\n'

      if (epic.allMeta.epic && epic.allMeta.epic.includes(epicId)) {
        const index = epic.allMeta.epic.findIndex((value) => value === epicId)
        epic.allMeta.epic.splice(index, 1)
      }
      epic.interpretedContent =
        epic.interpretedContent +
        `\n----\n## [Epic items](${epicUrl})\n${taskList}`
      epic.init()
    })
  }

  getTaskListMD(lists, epicFilter, epicUrl, epicId) {
    let content = ''

    lists
      .filter((list) => this.getEpicItemsInList(epicId, list.name))
      .reverse()
      .forEach((list) => {
        const tasks = this.getEpicItemsInList(epicId, list.name)
        const listUrl = epicUrl + encodeURIComponent(` and list=${list.name}`)
        const listLink = `[${list.name}](${listUrl})`
        content = content + '\n\n#### ' + listLink + '\n'
        content += '<ul style="list-style: none;">'
        content += tasks
          .map((task) => {
            const taskText = this.project.renderMarkdown(task.text, task.fullPath).replaceAll(/<p>|<\/p>/ig, '') // removeMD(task.text)
            const checked =
              task.list === this.project.doneList ? ' checked="true"' : ''
            const taskFilePath = encodeURI(
              `${task.source.repoId}/${task.source.path}`.replace(/\\/g, '/')
            )
            return `<li style="margin-left: 1rem; list-style: none;"><input type="checkbox" disabled="true"${checked}><a href="imdone://${taskFilePath}?line=${task.line}&filter=${epicFilter}" target="_blank">${taskText}</a></li>`
          })
          .join('\n')
        content += '</ul>'
      })

    return content
  }
}
