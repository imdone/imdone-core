#!/usr/bin/env node

const { program } = require('commander');
const _path = require('path')
const { createFileSystemProject } = require('./lib/project-factory')
const { loadYAML } = require('./tools')
const { readFile } = require('fs/promises')
const Config = require('./lib/config')

newConfigFromFile = async (configPath) => {
  const config = await readFile(configPath, 'utf8')
  return new Config(loadYAML(config))
}


program.command('init')
.description('Initialize imdone project')
.option('-p, --path <path>', 'The path to the imdone project')
.option('-c, --config <config>', 'The path to the imdone config file')
.action(async function () {
  let { path = process.env.PWD, config } = this.opts()
  path = _path.resolve(path)
  if (config) {
    configPath = _path.resolve(config)
    config = await newConfigFromFile(configPath)
  }
  const project = createFileSystemProject({path, config})
  await project.init()
})

program
.command('add <task>')
.description('Add a task')
.option('-p, --path <path>', 'The path to the imdone project')
.option('-l, --list <list>', 'The task list to use')
.action(function () {
  console.log(this.args)
  console.log(this.opts())
})

program.command('ls')
.description('List tasks')
.option('-p, --path <path>', 'The path to the imdone project')
.option('-l, --list <list>', 'The task list to use')
.option('-f, --filter <filter>', 'Filter tasks')
.action(function () {
  console.log(this.args)
  console.log(this.opts())
})
program.parse();
