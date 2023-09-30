const {simpleGit} = require('simple-git')
const promts = require('prompts')
const eol = require('eol')
const chalk = require('chalk')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')
const {
  importMarkdown,
 } = require('./MDStoryParser')

let consoleLog = () => {}
const ApplicationContext = () => {
  return {
    session: require('./StoryTaskSession'),
    git: simpleGit(),
    log: consoleLog
  }
}

const {
  configureProject,
  defaultProjectPath
} = require('./ProjectConfigFactory')

const {
  TASK_ID,
  UNGROUPED_TASKS
} = BacklogProject.constants

module.exports = CliController = {}


CliController.imdoneInit = async function () {
  configureProject({})
}

// TODO: This should ask for a group to add a task to
CliController.addTask = async function ({content, storyId, group, defaults, log}) {
  consoleLog = log
  storyId = await determineStoryId(storyId, defaults)
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, ApplicationContext)  

  const task = await storyProject.addTask({storyId, group, content})

  log(`${TASK_ID}:"${getTaskId(task)}"`)
}

CliController.listTasks = async function ({storyId, filter=null, json, log, defaults}) {
  consoleLog = log
  storyId = storyId || await determineStoryId(storyId, defaults)
  
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, ApplicationContext)  
  
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
  consoleLog = log
  importMarkdown(
    defaultProjectPath(),
    markdown,
    ApplicationContext
  )
}

CliController.startTask = async function (taskId, log) {
  consoleLog = log
  if (!taskId) {
    const storyId = await determineStoryId()
    taskId = await promptForTaskId(storyId)
  }
  const project = await BacklogProject.createAndInit(defaultProjectPath(), null, ApplicationContext)
  await project.startTask(taskId)
}

CliController.completeTask = async function (log) {
  consoleLog = log
  const storyId = await determineStoryId(null, true)
  
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, ApplicationContext)

  const task = await storyProject.completeTask()
  logTask(log, storyProject, task)
  log(chalk.bgGreen('Remember to commit and push!'))
}

function getTaskId(task) {
  const taskIdMeta = task.meta[TASK_ID]
  return taskIdMeta ? taskIdMeta[0] : null
}

async function determineStoryId(storyId, defaults) {
  storyId = storyId || await ApplicationContext().session.getStoryId()
  if (!storyId || !defaults) storyId = await promptForStoryId(storyId)
  return storyId
}

async function promptForStoryId(lastStoryId) {
  const backlogProject = new BacklogProject(defaultProjectPath(), null, ApplicationContext)
  await backlogProject.init()

  const storyIds = backlogProject.getStoryIds().filter(({list}) => list !== backlogProject.config.getDoneList())
  const choices = storyIds.map(({storyId, text}) => ({ title: `${storyId} [${text}]`, value: storyId }))
  const initial = storyIds.findIndex(({storyId}) => storyId === lastStoryId)
  const result = await promts({
    type: 'select',
    name: 'storyId',
    message: 'Select a story',
    choices,
    initial
  })
  return result.storyId
}

async function promptForTaskId(storyId) {
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, ApplicationContext)
  const tasks = storyProject.getTasks(`list != ${storyProject.config.getDoneList()}`)
  const choices = tasks.map(({text, meta}) => ({ title: `${text} [${meta[TASK_ID]}]`, value: meta[TASK_ID] }))
  const result = await promts({
    type: 'select',
    name: 'taskId',
    message: 'Select a task',
    choices
  })
  return result.taskId
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
