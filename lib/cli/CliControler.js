const {simpleGit} = require('simple-git')
const promts = require('prompts')
const eol = require('eol')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')
const {
  importMarkdown,
  UNGROUPED_TASKS,
 } = require('./MarkdownStoryParser')
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
  UNGROUPED_TASKS
}

const defaultProjectPath = path.join(process.env.PWD, DEFAULT_PROJECT_DIR)

CliController.DEFAULT_PROJECT_DIR = DEFAULT_PROJECT_DIR
CliController.DEFAULT_CONFIG_PATH = DEFAULT_CONFIG_PATH

CliController.imdoneInit = async function () {
  configureProject()
}

// TODO: This should ask for a group to add a task to
CliController.addTask = async function ({content, storyId, group, defaults, log}) {
  ApplicationContext.log = log
  storyId = await determineStoryId(storyId, defaults)
  const storyProject = new StoryProject(defaultProjectPath, null, storyId, ApplicationContext)
  await storyProject.init()

  const task = await storyProject.addTask({storyId, group, content})

  log(getTaskId(task))
}

CliController.listTasks = async function ({storyId, filter=null, json, log, defaults}) {
  ApplicationContext.log = log
  storyId = await determineStoryId(storyId, defaults)
  
  const storyProject = new StoryProject(defaultProjectPath, null, storyId, ApplicationContext)
  await storyProject.init()
  
  const tasks = storyProject.getTasks(filter)

  if (json) return log(
    JSON.stringify({
      name: storyProject.name,
      path: storyProject.path,
      tasks: storyProject.tasksToJson(tasks)
    }, null, 2)
  )

  const story = storyProject.getStory()
  const groupedTasks = getGroupedTasks(tasks)
  logStory(log, storyProject, story)
  logGroupedTasks(log, storyProject, groupedTasks)
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

function getTaskId(task) {
  const taskIdMeta = task.meta[TASK_ID]
  return taskIdMeta ? taskIdMeta[0] : null
}

async function determineStoryId(storyId, defaults) {
  storyId = storyId || await ApplicationContext.session.getStoryId()
  if (!storyId || !defaults) storyId = await promptForStoryId(storyId)
  return storyId
}

async function promptForStoryId(lastStoryId) {
  const backlogProject = new BacklogProject(defaultProjectPath, null, ApplicationContext)
  await backlogProject.init()

  const storyIds = backlogProject.getStoryIds()

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
  const groupedTasks = {}
  tasks.forEach((task) => {
    const group = task.meta.group
    if (group) {
      if (!groupedTasks[group]) groupedTasks[group] = []
      groupedTasks[group].push(task)
    } 
  })
  return groupedTasks
}

function logGroupedTasks(log, project, groupedTasks) {
  log('## Tasks')
  log('')
  Object.keys(groupedTasks).forEach((group) => {
    if (group !== UNGROUPED_TASKS) {
      log('')
      log(`### ${group}`)
      log('')
    }
    logTasks(log, project, groupedTasks[group])
  })
}

function logTasks(log, project, tasks) {
  tasks.forEach(task => logTask(log, project, task))
}

function logStory(log, project, story) {
  log(`# ${project.name}`)
  log('')
  log(`${story.text}`)
  log(story.description.filter(ln => !/^<!--(.*?)-->$/.test(ln)).join(String(eol.lf)))
}

function logTask(log, project, task) {
  const doneMark = (task.list === project.config.getDoneList()) ? 'x' : ' '
  log(`- [${doneMark}] ${task.text} <!-- task-id:"${getTaskId(task)}" -->`)
}
