const removeMD = require('remove-markdown')
const Plugin = require('imdone-api')

function isEpic(task) {
  return task.allMeta['is-epic'] && task.allMeta['is-epic'][0] 
}

function isEpicTask(task) {
  return task.allMeta['epic'] && task.allMeta['epic'][0]
}

module.exports = class EpicPlugin extends Plugin {
  constructor (project) {
    super(project)
  }

  onListsChange (lists) {
    const epics = this.findEpics(lists)
    this.updateCardMD(lists, epics)
  }

  onBeforeRenderCard(el) {
    el.querySelectorAll('.imdone-epic-items input').forEach(input => input.setAttribute('disabled', true))
    el.querySelectorAll('.imdone-epic-items ul').forEach(ul => ul.setAttribute('style', 'list-style: none;'))
    el.querySelectorAll('.imdone-epic-items li').forEach(li => li.setAttribute('style', 'margin-left: 1rem;'))
  }

  updateCardMD (lists, epics) {
    Object.keys(epics).forEach(epicId => {
      const {epic, tasks} = epics[epicId]
      if (!epic) return
      
      const realEpic = epic.find(task => !task.filteredListName)
      if (!realEpic) return

      const epicText = removeMD(realEpic.text)
      const epicFilter = encodeURIComponent(`(allMeta.epic="${epicId}" or allMeta.is-epic="${epicId}")`)
      const epicFilePath = encodeURI(`${realEpic.source.repoId}/${realEpic.source.path}`.replace(/\\/g, '/'))
      const epicUrl = `imdone://${epicFilePath}?line=${realEpic.line}&filter=${epicFilter}`
      const epicLink = `**Epic:** [${epicText}](${epicUrl})\n\n`
      
      const taskList = tasks.length === 0 
        ? '*None*\n' 
        : '\n<div class="imdone-epic-items">\n\n' + this.getTaskListMD(lists, tasks, epicFilter, epicUrl) + '\n\n</div>\n'

      // Add epic link to epic tasks
      tasks.forEach(task => {
        task.interpretedContent = epicLink + task.interpretedContent
      })
      
      epic.forEach(epic => {
        if (epic.allMeta.epic && epic.allMeta.epic.includes(epicId)) {
          const index = epic.allMeta.epic.findIndex(value => value === epicId)
          epic.allMeta.epic.splice(index, 1)
        }
        if (tasks.length === 0) return
        epic.interpretedContent = epic.interpretedContent + `\n----\n## [Epic items](${epicUrl})\n${taskList}`
        // console.log(epic.interpretedContent)
      })
    })
  }

  getTaskListMD (lists, tasks, epicFilter, epicUrl) {
    const _lists = lists
    .filter(list => !list.filter)
    .map(list => {
      return {name:list.name, tasks: []}
    })
    .reverse()
    
    tasks.forEach(task => {
      const list = _lists.find(list => task.list === list.name)
      if (!task.filteredListName) list.tasks.push(task)
    })

    let content = ''
    
    _lists
    .filter(list => list.tasks.length > 0)
    .forEach(list => {
      const listUrl = epicUrl + encodeURIComponent(` and list=${list.name}`)
      const listLink = `[${list.name}](${listUrl})`
      content = content + '\n\n#### ' + listLink + '\n'
      content += list.tasks.map(task => {
        const taskText = removeMD(task.text)
        const mark = task.list === this.project.doneList ? 'x' : ' '
        const taskFilePath = encodeURI(`${task.source.repoId}/${task.source.path}`.replace(/\\/g, '/'))
        return `- [${mark}] [${taskText}](imdone://${taskFilePath}?line=${task.line}&filter=${epicFilter})`  
      })
      .join('\n')
    })

    return content
  }

  findEpics (lists) {
    const epics = {}
    lists.forEach(({tasks}) => {
      tasks.forEach(task => {
        const isEpicMeta = isEpic(task)
        const epicMeta = isEpicTask(task)
        if (isEpicMeta && epicMeta) {
          delete task.allMeta.epic
          task.allMeta['is-epic'] = [epicMeta]
          if (!epics[epicMeta]) epics[epicMeta] = { epic: [], tasks:[] }
          epics[epicMeta].epic.push(task)
        } else if (isEpicMeta) {
          if (!epics[isEpicMeta]) epics[isEpicMeta] = { epic: [], tasks:[] }
          epics[isEpicMeta].epic.push(task)
        } else if (epicMeta) {
          if (!epics[epicMeta]) epics[epicMeta] = { epic: [], tasks: []}
          epics[epicMeta].tasks.push(task)
        }
      })
    });
    return epics;
  }
}