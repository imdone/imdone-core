const {simpleGit} = require('simple-git')
const promts = require('prompts')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')
const importMarkdown = require('./MarkdownStoryParser')
const ApplicationContext = require('./domain/adapters/ApplicationContext')()
ApplicationContext.session = require('./StoryTaskSession')
ApplicationContext.git = simpleGit()
const {
  configureProject,
} = require('./ProjectConfigFactory')

const DEFAULT_PROJECT_DIR = 'backlog'
const TASK_ID = 'task-id'
const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'config.yml')
module.exports = CliController = {
  git: simpleGit,
}

const defaultProjectPath = path.join(process.env.PWD, DEFAULT_PROJECT_DIR)

CliController.DEFAULT_PROJECT_DIR = DEFAULT_PROJECT_DIR
CliController.DEFAULT_CONFIG_PATH = DEFAULT_CONFIG_PATH

CliController.imdoneInit = async function () {
  configureProject()
}

// TODO: This should ask for a story to add a task to
CliController.addTask = async function ({task, projectPath = defaultProjectPath, list, tags, contexts, log}) {
  ApplicationContext.log = log
  if (!storyId) storyId = await promptForStoryId(storyId)

  const storyProject = new StoryProject(projectPath, null, storyId, ApplicationContext)
  await storyProject.init()
  const file = await storyProject.addTaskToFile({list, content: task, tags, contexts})
  file.rollback()
    .extractTasks(project.config)
  log(file.tasks[0].meta[TASK_ID][0])
}

CliController.listTasks = async function (storyId, filter = '', json, log) {
  ApplicationContext.log = log
  if (!storyId) storyId = await promptForStoryId(storyId)
  
  const storyProject = new StoryProject(defaultProjectPath, null, storyId, ApplicationContext)
  await storyProject.init()
  const project = storyProject.project
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

CliController.importMarkdown =  async function(markdown, log) {
  ApplicationContext.log = log
  importMarkdown(
    defaultProjectPath,
    markdown,
    ApplicationContext
  )
}

CliController.startTask = async function (taskId, log) {
  ApplicationContext.log = log
  const project = await new BacklogProject(defaultProjectPath, null, ApplicationContext);
  await project.init()
  await project.startTask(taskId)
}

async function promptForStoryId(storyId) {
  const backlogProject = new BacklogProject(defaultProjectPath, null, ApplicationContext)
  await backlogProject.init()

  const storyIds = backlogProject.getStoryIds()
  const lastStoryId = await ApplicationContext.session.getStoryId()

  const result = await promts({
    type: 'select',
    name: 'storyId',
    message: 'Select a story',
    choices: storyIds.map((storyId) => ({ title: storyId, value: storyId })),
    initial: storyIds.indexOf(lastStoryId)
  })
  return result.storyId
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
