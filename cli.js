#!/usr/bin/env node

const { program } = require('commander');
const ora = require('ora')
const { 
  imdoneInit, 
  importMarkdown,
  startTask,
  addTask, 
  listTasks ,
  completeTask
} = require('./lib/cli/CliControler')
const package = require('./package.json')

const { log } = hideLogs()
const spinner = ora('Loading unicorns')

setTimeout(() => {
	spinner.color = 'yellow';
	spinner.text = 'Loading rainbows';
}, 1000);

const DEFAULTS_OPTION = ['-d, --defaults', 'Use defaults in ~/.imdone/session.json for all prompts']
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
.command('start <task-id>')
.description('start a task by id')
.action(async function () {
  spinner.start()
  const taskId = this.args[0]
  await startTask(taskId, log)
  spinner.stop()
})

program
.command('done')
.description('Mark the current task as done')
.action(async function () {
  spinner.start()
  await completeTask(log)
  spinner.stop()
})

program
.command('add-task <task-content>')
.description('add a task')
.option(...STORY_OPTION)
.option('-g, --group <group>', 'The group to add this task to')
.option(...DEFAULTS_OPTION)
.action(async function () {
  let { storyId, group, defaults } = this.opts()
  await addTask({content: this.args[0], storyId, group, defaults, log})
})

program
.command('ls')
.description('list tasks')
.option(...STORY_OPTION)
.option('-f, --filter <filter>', 'The filter to use')
.option('-j, --json', 'Output as json')
.option(...DEFAULTS_OPTION)
.action(async function () {
  let {storyId, filter, json, defaults } = this.opts()
  await listTasks({storyId, filter, json, defaults, log})
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
