#!/usr/bin/env node

const { program } = require('commander');
const ora = require('ora')
const chalk = require('chalk')
const package = require('./package.json')
const { createFileSystemProject } = require('./lib/project-factory.js')
const { getYamlConfig } = require('./lib/adapters/storage/config.js')
// const { log } = hideLogs()
const spinner = ora('Loading unicorns')


setTimeout(() => {
	spinner.color = 'yellow';
	spinner.text = 'Loading rainbows';
}, 1000);

function actionCancelled() {
  log(chalk.bgRed('Action canceled'))
}

const mainCmd = program
.version(package.version, '-v, --version', 'output the current version')

mainCmd
.command('action <pluginName> <actionTitle>')
.option('-t, --task <task>', 'Task filePath:line')
.option('-w, --working-dir <workingDir>', 'Working directory')
.option('-c, --config <config>', 'Config file path')
.description('Run a board action')
.action(async function (plugin, title, options) {
  spinner.start()
  const action = {plugin, title}
  const [filePath, line] = options.task ? options.task.split(':') : []
  try {
    const path = options.workingDir || process.env.PWD
    const config = options.config && await getYamlConfig(options.config)
    const project = createFileSystemProject({path, config})
    await project.init()
    await project.toImdoneJSON()
    chalk.bgGreen('Project loaded')
    const file = filePath && project.getFile(filePath)
    const task = file && line > -1 && file.getTaskAtLine(line)
    await project.performBoardAction(action, task)
  } catch (e) {
    console.error(e)
    actionCancelled()
  } finally {
    spinner.stop()
    process.exit(0)
  }
})


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

function actionCancelled() {
  log(chalk.bgRed('Action canceled'))
}
