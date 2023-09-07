#!/usr/bin/env node

const { program } = require('commander');
const { imdoneInit, importMarkdown, addTask, listTasks } = require('./lib/cli/CliControler')
const package = require('./package.json')
const path = require('path')

const { log, info, warn, logQueue } = hideLogs()
const defaultProjectPath = path.join(process.env.PWD, 'backlog')
// TODO ## Add an option to add properties/card.js
program
.version(package.version, '-v, --version', 'output the current version')
.command('init')
.description('initialize imdone project')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-c, --config-path <path>', 'The path to the imdone config file')
.action(async function () {
  let { projectPath = defaultProjectPath, configPath } = this.opts()
  await imdoneInit({projectPath, configPath})
})

program
.command('import')
.description('import markdown from STDIN')
.option('-p, --project-path <path>', 'The path to the imdone project')
.action(async function () {
  let { projectPath = defaultProjectPath } = this.opts()
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
.command('add <task>')
.description('add a task')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-l, --list <list>', 'The task list to use')
.option('-t, --tags <tags...>', 'The tags to use')
.option('-c, --contexts <contexts...>', 'The contexts to use')
.action(async function () {
  let { projectPath = defaultProjectPath, list, tags, contexts } = this.opts()
  await addTask({task: this.args[0], projectPath, list, tags, contexts, log})
})

program
.command('ls')
.description('list tasks')
.option('-p, --project-path <path>', 'The path to the imdone project')
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.action(async function () {
  let { projectPath = defaultProjectPath, filter, json } = this.opts()
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
