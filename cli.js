#!/usr/bin/env node

const { program } = require('commander');
const ora = require('ora')
const { 
  imdoneInit, 
  importMarkdown,
  startTask,
  addTask, 
  listTasks 
} = require('./lib/cli/CliControler')
const package = require('./package.json')

const { log } = hideLogs()
const spinner = ora('Loading unicorns')

setTimeout(() => {
	spinner.color = 'yellow';
	spinner.text = 'Loading rainbows';
}, 1000);

program
.version(package.version, '-v, --version', 'output the current version')
.command('init')
.description('initialize backlog')
.action(async function () {
  spinner.start()
  await imdoneInit()
  spinner.stop()
})

program
.command('import')
.description('import markdown from STDIN')
.action(async function () {
  spinner.start()
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
    await importMarkdown(markdown, log)
    spinner.stop()
  });
})

program
.command('start <task-id>')
.description('start a task by id')
.action(async function () {
  spinner.start()
  const taskId = this.args[0]
  await startTask(taskId, log)
  spinner.stop()
})

program
.command('add <task>')
.description('add a task')
.option('-s, --story-id <story-id>', 'The story to add this task to')
.option('-g, --group <group>', 'The group to add this task to')
.option('-t, --tags <tags...>', 'The tags to add to this task')
.option('-c, --contexts <contexts...>', 'The contexts to add to this task')
.action(async function () {
  // TODO: This should ask for a story to add a task to
  // TODO: This should ask for a group to add a task to
  let { storyId, group, tags, contexts } = this.opts()
  await addTask({task: this.args[0], projectPath, list, tags, contexts, log})
})

program
.command('ls')
.description('list tasks')
.option('-s, --story-id <story-id>', 'List tasks for this story')
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.action(async function () {
  let {storyId, filter, json } = this.opts()
  await listTasks(storyId, filter, json, log)
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
