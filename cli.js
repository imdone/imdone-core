#!/usr/bin/env node

const { program } = require('commander');
const { 
  DEFAULT_CONFIG_PATH, 
  imdoneInit, 
  importMarkdown,
  startTask,
  addTask, 
  listTasks 
} = require('./lib/cli/CliControler')
const package = require('./package.json')
const path = require('path')

const { log, info, warn, logQueue } = hideLogs()
const PROJECT_OPTION = '-p, --project-path <path>'
const PROJECT_OPTION_DESCRIPTION = 'The path to the imdone project'
const CONFIG_OPTION = '-c, --config-path <path>'
const CONFIG_OPTION_DESCRIPTION = 'The path to the imdone config file'

program
.version(package.version, '-v, --version', 'output the current version')
.command('init')
.description('initialize imdone project')
.option(PROJECT_OPTION, PROJECT_OPTION_DESCRIPTION)
.option(CONFIG_OPTION, CONFIG_OPTION_DESCRIPTION, DEFAULT_CONFIG_PATH)
.action(async function () {
  let { projectPath, configPath } = this.opts()
  await imdoneInit({projectPath, configPath})
})

program
.command('import')
.description('import markdown from STDIN')
.option(PROJECT_OPTION, PROJECT_OPTION_DESCRIPTION)
.action(async function () {
  let { projectPath } = this.opts()
  const isTTY = process.stdin.isTTY;
  const stdin = process.stdin;
  if (isTTY) return console.error('Markdown must be provided as stdin')

  var markdown = '';
  
  stdin.on('readable', function() {
      var chunk = stdin.read();
      if(chunk !== null){
          markdown += chunk;
      }
  });
  stdin.on('end', async function() {
    await importMarkdown(projectPath, markdown, log)
  });
})

program
.command('start <task-id>')
.description('start a task by id')
.option(PROJECT_OPTION, PROJECT_OPTION_DESCRIPTION)
.action(async function () {
  const taskId = this.args[0]
  let { projectPath } = this.opts()
  await startTask(projectPath, taskId, log)
})

program
.command('add <task>')
.description('add a task')
.option(PROJECT_OPTION, PROJECT_OPTION_DESCRIPTION)
.option('-l, --list <list>', 'The task list to use')
.option('-t, --tags <tags...>', 'The tags to use')
.option('-c, --contexts <contexts...>', 'The contexts to use')
.action(async function () {
  let { projectPath, list, tags, contexts } = this.opts()
  await addTask({task: this.args[0], projectPath, list, tags, contexts, log})
})

program
.command('ls')
.description('list tasks')
.option(PROJECT_OPTION, PROJECT_OPTION_DESCRIPTION)
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.action(async function () {
  let { projectPath, filter, json } = this.opts()
  await listTasks(projectPath, filter, json, log)
})
program.parse();

function hideLogs() {
  const log = console.log
  const info = console.info
  const warn = console.warn
  const logQueue = {warn: [], info: [], log: []}
  Object.keys(logQueue).forEach((key) => {
    console[key] = function(...args) {
      logQueue[key].push(args)
    }
  })
  return {log, info, warn, logQueue}
}
