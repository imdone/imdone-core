const { resolve } = require('path')
const { createFileSystemProject } = require('../project-factory')
const { loadYAML } = require('../tools')
const { readFile } = require('fs/promises')
const Config = require('../config')

newConfigFromFile = async (configPath) => {
  const config = await readFile(configPath, 'utf8')
  return new Config(loadYAML(config))
}


module.exports = {
  imdoneInit: async function (projectPath, configPath) {
    projectPath = resolve(projectPath)
    let config
    if (configPath) {
      configPath = resolve(configPath)
      config = await newConfigFromFile(configPath)
    }
    const project = createFileSystemProject({path: projectPath, config})
    return await project.init()
  },

  addTask: async function (task, projectPath, list, tags, contexts) {
    projectPath = resolve(projectPath)
    const project = createFileSystemProject({path: projectPath})
    await project.init()
    const data = await project.addTaskToFile({list, content: task, tags, contexts})
  },

  listTasks: async function (projectPath, filter, json, log) {
    projectPath = resolve(projectPath)
    const project = createFileSystemProject({path: projectPath})
    await project.init()
    const tasks = project.getCards(filter)
    const lists = project.getLists({tasks})
  
    if (json) return log(JSON.stringify(lists, null, 2))
  
    if (project.getCards('meta.group=*', tasks).length > 0) {
      const groupedTasks = getGroupedTasks(tasks)
      logProject(log, project)
      logGroupedTasks(log, project, groupedTasks)
    } else {
      logProject(log, project)
      logLists(log, project, lists, '##')
    }
  }  
}

function getGroupedTasks(tasks) {
  const groupedTasks = {"Ungrouped Tasks": []}
  tasks.forEach((task) => {
    const group = task.meta.group
    if (group) {
      if (!groupedTasks[group]) groupedTasks[group] = []
      groupedTasks[group].push(task)
    } else {
      groupedTasks["Ungrouped Tasks"].push(task)
    }
  })
  return groupedTasks
}

function logGroupedTasks(log, project, groupedTasks) {
  Object.keys(groupedTasks).forEach((group) => {
    log(`## ${group}`)
    log('')
    logLists(log, project, project.getLists({tasks: groupedTasks[group]}), '###')
  })
}

function logLists(log, project, lists, heading) {
  lists.forEach((list) => {
    const tasks = list.tasks
    if (tasks.length > 0) {
      log(`${heading} ${list.name}`)
      log('')
      logTasks(log, project, tasks)
      log('')
    }
  })  
}

function logTasks(log, project, tasks) {
  tasks.forEach(task => logTask(log, project, task))
}

function logProject(log, project) {
  log(project.name)
  log('====')
  log('')
}

function logTask(log, project, task) {
  const doneMark = (task.list === project.config.getDoneList()) ? 'x' : ' '
  log(`- [${doneMark}] ${task.text}`)
  task.description.forEach((line) => {
    log(`  ${line}`)
  })
}
