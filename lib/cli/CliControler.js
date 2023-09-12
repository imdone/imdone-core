const eol = require('eol')
const {simpleGit} = require('simple-git')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')
const parseMarkdownStory = require('./MarkdownStoryParser')
const { 
  setProjectPath,
  getProjectPath,
  setTaskId,
  getTaskId,
  setStoryId,
  getStoryId,
  setBranchName
} = require('./StoryTaskSession')

const ApplicationContext = require('./domain/adapters/ApplicationContext')()
ApplicationContext.session = require('./StoryTaskSession')
ApplicationContext.git = simpleGit()
const {
  configureProject,
  newBacklogProject,
  newStoryProject
} = require('./ProjectConfigFactory')

const DEFAULT_PROJECT_DIR = 'backlog'
const TASK_ID = 'task-id'
const STORY_ID = 'story-id'
const TODO = 'TODO'
const DOING = 'DOING'
const DONE = 'DONE'
const ORDER = 'order'
const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'config.yml')
module.exports = CliController = {
  git: simpleGit,
}

const defaultProjectPath = path.join(process.env.PWD, DEFAULT_PROJECT_DIR)

CliController.DEFAULT_PROJECT_DIR = DEFAULT_PROJECT_DIR
CliController.DEFAULT_CONFIG_PATH = DEFAULT_CONFIG_PATH

CliController.imdoneInit = async function ({projectPath, configPath, tasksDir}) {
  configureProject({projectPath, configPath, tasksDir})
}

CliController.addTask = async function ({task, projectPath = defaultProjectPath, list, tags, contexts, log}) {
  const backlogProject = await new BacklogProject(projectPath).init()
  const project = backlogProject.project
  const file = await project.addTaskToFile({list, content: task, tags, contexts})
  file.rollback()
    .extractTasks(project.config)
  log(file.tasks[0].meta[TASK_ID][0])
}

CliController.listTasks = async function (projectPath = defaultProjectPath, filter, json, log) {
  const backlogProject = await new BacklogProject(projectPath).init()
  const project = backlogProject.project
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
  const backlogProject = await newBacklogProject({projectPath, ApplicationContext}).init()
  let { storyId, description, tasks } = parseMarkdownStory(markdown)
  storyId = backlogProject.sanitizeFileName(storyId)
  const storyProject = await newStoryProject({projectPath, storyId, ApplicationContext})
  storyProject.project.removeList('BACKLOG')
  setProjectPath(storyProject.project.path)
  await addStoryTask(storyProject.project, storyId, eol.split(description)[0], tasks, log)

  tasks.forEach(async (task, i) => {
    const order = (i + 1) * (10)
    const list = task.done ? DONE : TODO
    const file = await storyProject.project.addTaskToFile({list, tags: ['task'], content: task.text})
    file.rollback()
      .extractTasks(backlogProject.config)
    
    await storyProject.project.addMetadata(file.tasks[0], 'group', task.group)
    await storyProject.project.addMetadata(file.tasks[0], STORY_ID, storyId)
    await storyProject.project.addMetadata(file.tasks[0], ORDER, order)
  })
}

CliController.startTask = async function (projectPath = defaultProjectPath, taskId, log) {
  ApplicationContext.log = log
  const project = await new StoryProject(projectPath, null, ApplicationContext);
  await project.init()
  await project.startTask(taskId)
}

async function addStoryTask(storyProject, storyId, description) {
  const storyPath = path.join(storyProject.path, 'README.md')
  const file = await storyProject.addTaskToFile({ path: storyPath, list: 'NOTE', tags: ['story'], content: description })
  file.rollback()
    .extractTasks(storyProject.config)
  await storyProject.addMetadata(file.tasks[0], ORDER, 0)
  await storyProject.addMetadata(file.tasks[0], STORY_ID, storyId)
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

