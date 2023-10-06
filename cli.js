#!/usr/bin/env node

const { program } = require('commander');
const ora = require('ora')
const chalk = require('chalk')
const { 
  imdoneInit, 
  importMarkdown,
  startTask,
  addTask, 
  listTasks ,
  completeTask,
  showCurrentTask,
  openBacklog
} = require('./lib/cli/CliControler')
const package = require('./package.json')

const { log } = hideLogs()
const spinner = ora('Loading unicorns')

setTimeout(() => {
	spinner.color = 'yellow';
	spinner.text = 'Loading rainbows';
}, 1000);

function actionCancelled() {
  log(chalk.bgRed('Action canceled'))
}

const STORY_OPTION = ['-s, --story-id <story-id>', 'The story to add this task to'] 
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
.command('open')
.description('open backlog in imdone')
.action(async function () {
  spinner.start()
  await openBacklog(log)
  spinner.stop()
})

program
.command('task')
.description('Show the current task')
.action(async function () {
  await showCurrentTask(log)
})

program
.command('start [task-id]')
.description('start a task by id')
.action(async function () {
  const taskId = this.args.length > 0 ? this.args[0]: null
  try {
    await startTask(taskId, log)
  } catch (e) {
    actionCancelled()
  }
})

program
.command('done')
.description('Mark the current task as done')
.action(async function () {
  try {
    await completeTask(log)
  } catch (e) {
    actionCancelled()
  }
})

program
.command('add-task <task-content>')
.description('add a task')
.option(...STORY_OPTION)
.option('-g, --group <group>', 'The group to add this task to')
.action(async function () {
  let { storyId, group } = this.opts()
  try {
    await addTask({content: this.args[0], storyId, group, log})
  } catch (e) {
    actionCancelled()
  }
})

program
.command('ls')
.description('list tasks')
.option(...STORY_OPTION)
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.action(async function () {
  let {storyId, filter, json } = this.opts()
  try {
    await listTasks({storyId, filter, json, log})
  } catch (e) {
    actionCancelled()
  }
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
