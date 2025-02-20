#!/usr/bin/env node

const { program } = require('commander');
const ora = require('ora')
const chalk = require('chalk')
const { 
  imdoneInit, 
  planStory,
  startTask,
  addTask, 
  listTasks ,
  completeTask,
  openBoard,
  openTaskFile,
  exportProject
} = require('./lib/cli/CliControler')
const {
  STORY_ID
} = require('./lib/cli/domain/BacklogProject').constants
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

const STORY_OPTION = `-s, --${STORY_ID} `
const STORY_OPTION_OPTIONAL = `${STORY_OPTION}[${STORY_ID}]`
const STORY_OPTION_REQUIRED = `${STORY_OPTION}<${STORY_ID}>`

const mainCmd = program
.version(package.version, '-v, --version', 'output the current version')

mainCmd
.command('export')
.description('Export the current project')
.action(async function () {
  try {
    await exportProject(log)
  } catch (e) {
    console.error(e)
    actionCancelled()
  } finally {
    process.exit(0)
  }
})

addDevCmd(mainCmd)

program.parse();

function hideLogs() {
  const log = console.log
  const info = console.info
  const warn = console.warn
  const logQueue = {warn: [], info: [], log: []}
  if (!process.env.DEBUG) {
    Object.keys(logQueue).forEach((key) => {
      console[key] = function(...args) {
        logQueue[key].push(args)
      }
    })
  }
  return {log, info, warn, logQueue}
}


async function planAStory(markdown, storyId, log) {
  try {
    await planStory(markdown, storyId, log)
  } catch (e) {
    log(chalk.yellowBright(e.message))
  }
}

function addDevCmd(mainCmd) {
  const devCmd = mainCmd
  .command('dev')
  .description('Plan and track your storys and tasks')

  devCmd
  .command('init')
  .description('initialize backlog')
  .action(async function () {
    try {
      await imdoneInit()
    } catch (e) {
      log(chalk.yellowBright(e.message))
    } finally {
      process.exit(0)
    }
  })

  devCmd
  .command('plan')
  .option(STORY_OPTION_OPTIONAL, 'Update an existing story\'s tasks')
  .description('Plan a story with tasks and DoD')
  .action(async function () {
    let markdown
    let { storyId } = this.opts()
    if (process.stdin.isTTY) {
      await planAStory(markdown, storyId, log)
      process.exit(0)
    } else {

      const stdin = process.stdin;
      spinner.start()

      markdown = ''
      
      stdin.on('readable', function() {
          var chunk = stdin.read();
          if(chunk !== null){
              markdown += chunk;
          }
      });
      stdin.on('end', async function() {
        await planAStory(markdown, storyId, log)
        spinner.stop()
        process.exit(0)
      });
    }
  })

  devCmd
  .command('open')
  .description('Open the current or selected task in the default markdown editor')
  .action(async function () {
    try {
      await openTaskFile(log)
    } catch (e) {
      log(chalk.yellowBright(e.message))
    } finally {
      process.exit(0)
    }
  })

  devCmd
  .command('board')
  .description('Open the current task in imdone')
  .action(async function () {
    try {
      spinner.start()
      await openBoard(log)
      spinner.stop()  
    } catch (e) {
      log(chalk.yellowBright(e.message))
    } finally {
      process.exit(0)
    }
  })

  devCmd
  .command('start [task-id]')
  .description('Start a task by id')
  .action(async function () {
    const taskId = this.args.length > 0 ? this.args[0]: null
    try {
      await startTask(taskId, log)
    } catch (e) {
      if (e instanceof ChangesExistError) {
        log(chalk.yellowBright(e.message))
      } else {
        actionCancelled()
      }
    } finally {
      process.exit(0)
    }
  })

  devCmd
  .command('done')
  .description('Mark the current task as done')
  .action(async function () {
    try {
      await completeTask(log)
    } catch (e) {
      actionCancelled()
    } finally {
      process.exit(0)
    }
  })

  devCmd
  .command('add-task <task-content>')
  .description('Add a task to a story')
  .option(STORY_OPTION_REQUIRED, 'The story to add this task to')
  .option('-g, --group <group>', 'The group to add this task to')
  .action(async function () {
    let { storyId, group } = this.opts()
    try {
      await addTask({content: this.args[0], storyId, group, log})
    } catch (e) {
      actionCancelled()
    } finally {
      process.exit(0)
    }
  })

  devCmd
  .command('ls')
  .description('list tasks')
  .option(STORY_OPTION_REQUIRED, 'The story to list tasks for')
  .option('-f, --filter <filter>', 'The filter to use')
  .option('-j, --json', 'Output as json')
  .action(async function () {
    let {storyId, filter, json } = this.opts()
    try {
      await listTasks({storyId, filter, json, log})
    } catch (e) {
      
      actionCancelled()
    } finally {
      process.exit(0)
    }
  })
}
