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
  
    lists.forEach((list) => {
      const doneMark = (list.name === project.config.getDoneList()) ? 'x' : ' '
      const tasks = list.tasks
      if (tasks.length > 0) {
        log('')
        log(list.name)
        log('====')
        log('')
        tasks.forEach((task) => {
          log(`- [${doneMark}] ${task.text}`)
          task.description.forEach((line) => {
            log(`  ${line}`)
          })
        })
        log('')
      }
    })
  }  
}