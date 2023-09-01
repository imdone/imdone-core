#!/usr/bin/env node

const { program } = require('commander');
const { imdoneInit, addTask, listTasks } = require('./lib/controlers/CliControler')
const package = require('./package.json')

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
  await imdoneInit(projectPath, configPath)
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
  await addTask(this.args[0], projectPath, list, tags, contexts)
})

program
.command('ls')
.description('list tasks')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.action(async function () {
  let { projectPath = process.env.PWD, filter, json } = this.opts()
  await listTasks(projectPath, filter, json, log)
})
program.parse();
