const { resolve } = path = require('path')
const eol = require('eol')
const { readFile, mkdir, rm, cp } = require('fs/promises')
const {simpleGit} = require('simple-git')
const { loadYAML } = require('../tools')
const Config = require('../config')
const { createFileSystemProject } = require('../project-factory')
const parseMarkdownStory = require('./MarkdownStoryParser')
const { 
  setProjectPath,
  getProjectPath,
  setTaskId,
  getTaskId,
  setStoryId,
  getStoryId
} = require('./StoryTaskSession')

const DEFAULT_PROJECT_DIR = 'backlog'
const STORIES_DIR = 'stories'
const TASKS_DIR = 'tasks'
const TASK_ID = 'task-id'
const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'config.yml')
const CARD_PROPERTIES_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'properties')
const ACTIONS_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'actions')
const CliController = {}

const defaultProjectPath = path.join(process.env.PWD, DEFAULT_PROJECT_DIR)

CliController.DEFAULT_PROJECT_DIR = DEFAULT_PROJECT_DIR
CliController.DEFAULT_CONFIG_PATH = DEFAULT_CONFIG_PATH
CliController.imdoneInit = async function ({projectPath = defaultProjectPath, configPath = DEFAULT_CONFIG_PATH, tasksDir = STORIES_DIR}) {
  projectPath = resolve(projectPath)
  configPath = resolve(configPath)

  await cp(CARD_PROPERTIES_PATH, path.join(projectPath, '.imdone', 'properties'), { recursive: true })
  await cp(ACTIONS_PATH, path.join(projectPath, '.imdone', 'actions'), { recursive: true })
  await mkdir(path.join(projectPath, tasksDir), {recursive: true})
  
  const config = await newConfigFromFile(configPath)
  config.name = path.basename(projectPath)
  config.journalPath = tasksDir
  
  return await init(projectPath, config)
}

CliController.addTask = async function ({task, projectPath = defaultProjectPath, list, tags, contexts, log}) {
  const project = await init(projectPath)
  const file = await project.addTaskToFile({list, content: task, tags, contexts})
  file.rollback()
    .extractTasks(project.config)
  log(file.tasks[0].meta[TASK_ID][0])
}

CliController.listTasks = async function (projectPath = defaultProjectPath, filter, json, log) {
  const project = await init(projectPath)
  const tasks = project.getCards(filter)
  const lists = project.getLists({tasks})

  if (json) return log(JSON.stringify(lists, null, 2))

  if (project.getCards('meta.group=*', tasks).length > 0) {
    const groupedTasks = getGroupedTasks(tasks)
    logProject(log, project)
    logGroupedTasks(log, project, groupedTasks)
  } else {
    logProject(log, project)
    logLists(log, project, lists, '##')
  }
}

CliController.importMarkdown =  async function(projectPath = defaultProjectPath, markdown, log) {
  const project = await CliController.imdoneInit({projectPath})
  const { storyId, description, tasks } = parseMarkdownStory(markdown)
  const storyProject = await createStoryProject(projectPath, storyId, log)
  setProjectPath(storyProject.path)
  await addStoryTask(storyProject, storyId, eol.split(description)[0], tasks, log)

  tasks.forEach(async (task, i) => {
    const order = (i + 1) * (10)
    const list = task.done ? 'DONE' : 'TODO'
    const file = await storyProject.addTaskToFile({list, tags: ['task'], content: task.text})
    file.rollback()
      .extractTasks(project.config)
    
    await storyProject.addMetadata(file.tasks[0], 'group', task.group)
    await storyProject.addMetadata(file.tasks[0], 'story-id', storyId)
    await storyProject.addMetadata(file.tasks[0], 'order', order)
  })
}

// #### Start a task
// ```bash
// npx imdone start <task-id>
// ```
// - [ ] This should find the task and create a branch named `story/<sid>/<group>/<task id>/<task filname>`
// - [x] Move the task to the `DOING` list
// - [ ] If the branch exists, check it out
// - [ ] Set the task id in session so we know what to close
// - [ ] Save the branch name in session so we can check it out again

CliController.startTask = async function (projectPath = defaultProjectPath, taskId, log) {
  const project = await init(projectPath)
  const task = project.getCards().find(({meta}) => meta[TASK_ID] && meta[TASK_ID][0] === taskId)
  const storyId = task.meta['story-id'][0]

  await setProjectPath(getStoryProjectPath(projectPath, storyId))
  await setTaskId(taskId)
  await setStoryId(storyId)
  const taskName = project.sanitizeFileName(task.text)
  const branchName = `story/${storyId}/task/${taskName}`

  project.moveTask(task, 'DOING', 0)
  log(`git checkout -b ${branchName}`)
  await simpleGit().checkoutBranch(branchName)
}

module.exports = CliController

async function init(projectPath, config) {
  projectPath = resolve(projectPath)
  const project = createFileSystemProject({path: projectPath, config})
  await project.init()
  return project
}

async function addStoryTask(storyProject, storyId, description) {
  const storyPath = path.join(storyProject.path, 'README.md')
  const file = await storyProject.addTaskToFile({ path: storyPath, list: 'NOTE', tags: ['story'], content: description })
  file.rollback()
    .extractTasks(storyProject.config)
  await storyProject.addMetadata(file.tasks[0], 'order', 0)
  await storyProject.addMetadata(file.tasks[0], 'story-id', storyId)
}

async function createStoryProject(projectPath, storyId, log) {
  const storyProjectPath = getStoryProjectPath(projectPath, storyId)
  try {
    await rm(storyProjectPath, { recursive: true })
    await mkdir(storyProjectPath, { recursive: true })
  } catch (e) {
    log(`${e.code}: ${e.path}`)
  }
  const tasksDir = TASKS_DIR
  const storyProject = await CliController.imdoneInit({ projectPath: storyProjectPath, tasksDir })
  storyProject.removeList('BACKLOG')
  return storyProject
}

function getStoryProjectPath(projectPath, storyId) {
  return path.join(projectPath, STORIES_DIR, storyId)
}

async function newConfigFromFile(configPath) {
  const config = await readFile(configPath, 'utf8')
  return new Config(loadYAML(config))
}

function getGroupedTasks(tasks) {
  const groupedTasks = {"Stories": []}
  tasks.forEach((task) => {
    const group = task.meta.group
    if (group) {
      if (!groupedTasks[group]) groupedTasks[group] = []
      groupedTasks[group].push(task)
    } else {
      groupedTasks["Stories"].push(task)
    }
  })
  return groupedTasks
}

function logGroupedTasks(log, project, groupedTasks) {
  Object.keys(groupedTasks).forEach((group) => {
    log(`## ${group}`)
    log('')
    logLists(log, project, project.getLists({tasks: groupedTasks[group]}), '###')
  })
}

function logLists(log, project, lists, heading) {
  lists.forEach((list) => {
    const tasks = list.tasks
    if (tasks.length > 0) {
      log(`${heading} ${list.name}`)
      log('')
      logTasks(log, project, tasks)
      log('')
    }
  })  
}

function logTasks(log, project, tasks) {
  tasks.forEach(task => logTask(log, project, task))
}

function logProject(log, project) {
  log(project.name)
  log('====')
  log('')
}

function logTask(log, project, task) {
  const doneMark = (task.list === project.config.getDoneList()) ? 'x' : ' '
  log(`- [${doneMark}] ${task.text}`)
  task.description.forEach((line) => {
    log(`  ${line}`)
  })
}
