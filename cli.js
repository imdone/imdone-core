#!/usr/bin/env node

const { program } = require('commander');
const { resolve } = require('path')
const { createFileSystemProject } = require('./lib/project-factory')
const { loadYAML } = require('./lib/tools')
const { readFile } = require('fs/promises')
const Config = require('./lib/config')
const package = require('./package.json')

newConfigFromFile = async (configPath) => {
  const config = await readFile(configPath, 'utf8')
  return new Config(loadYAML(config))
}

const log = console.log
const info = console.info
const warn = console.warn
const logQueue = {warn: [], info: [], log: []}
Object.keys(logQueue).forEach((key) => {
  console[key] = function(...args) {
    logQueue[key].push(args)
  }
})

program
.version(package.version, '-v, --version', 'output the current version')
.command('init')
.description('initialize imdone project')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-c, --config-path <path>', 'The path to the imdone config file')
.action(async function () {
  let { projectPath = process.env.PWD, configPath } = this.opts()
  projectPath = resolve(projectPath)
  let config
  if (configPath) {
    configPath = resolve(configPath)
    config = await newConfigFromFile(configPath)
  }
  const project = createFileSystemProject({path: projectPath, config})
  await project.init()
})

program
.command('add <task>')
.description('add a task')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-l, --list <list>', 'The task list to use')
.option('-t, --tags <tags...>', 'The tags to use')
.option('-c, --contexts <contexts...>', 'The contexts to use')
.action(async function () {
  let { projectPath = process.env.PWD, list, tags, contexts } = this.opts()
  projectPath = resolve(projectPath)
  const project = createFileSystemProject({path: projectPath})
  await project.init()
  const data = await project.addTaskToFile({list, content: this.args[0], tags, contexts})
})

program
.command('ls')
.description('list tasks')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.action(async function () {
  let { projectPath = process.env.PWD, filter, json } = this.opts()
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
})
program.parse();
