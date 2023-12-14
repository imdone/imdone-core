const ApplicationContext = require('./adapters/ApplicationContext')
const {simpleGit} = require('simple-git')
const prompts = require('prompts')
const eol = require('eol')
const chalk = require('chalk')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')
const commandExists = require('command-exists')
const git = simpleGit()
const {
  importMarkdown,
 } = require('./MDStoryParser')

let consoleLog = () => {}
const applicationContext = () => {
  return {
    ...ApplicationContext(),
    log: consoleLog
  }
}

const {
  configureProject,
  defaultProjectPath,
  projectExists,
} = require('./ProjectConfigFactory')

const {promptForMarkdownPlan} = require('./prompts/MarkdownPlanPrompt.js')
const {
  TASK_ID,
  UNGROUPED_TASKS
} = BacklogProject.constants

module.exports = CliController = {}


CliController.imdoneInit = async function () {
  if (await projectExists(defaultProjectPath())) {
    throw new Error('Imdone backlog is already initialized!')
  }
  const defaultBranch = await promptForDefaultBranch()
  const remote = await promptForRemote()
  await configureProject({defaultBranch, remote})
}

CliController.openBoard = async function (log) {
  const open = (await import('open')).default
  try {
    await commandExists('imdone')
    const { storyProject, task } = await getCurrentTask()
    const taskId = task && task.meta[TASK_ID] && task.meta[TASK_ID][0]
    
    if (storyProject) {
      const queryString = taskId ? `?filter=meta.${TASK_ID}="${taskId}"` : ''
      open(`imdone://${storyProject.path}${queryString}`)
    } else {
      open(`imdone://${defaultProjectPath()}`)
    }
  } catch (e) {
    console.error(e)
    log(`\nimdone is not installed! Visit ${chalk.green('https://imdone.io')} to install imdone.`)
    open(`https://imdone.io`)
  }
}

CliController.openTaskFile = async function (log) {
  const open = (await import('open')).default
  let { task } = await getCurrentTask()
  if (!task) {
    const storyId = await promptForStoryId()
    const taskId = await promptForTaskId(storyId)
    const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, applicationContext)  
    task = storyProject.getTask(taskId)
  }
  open(task.fullPath)
}


// TODO: This should ask for a group to add a task to
CliController.addTask = async function ({content, storyId, group, log}) {
  consoleLog = log
  storyId = await determineStoryId(applicationContext, storyId)
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, applicationContext)  

  const task = await storyProject.addTask({group, content})

  log(`${TASK_ID}:"${getTaskId(task)}"`)
}

CliController.listTasks = async function ({storyId, filter=null, json, log}) {
  consoleLog = log
  storyId = storyId || await determineStoryId(applicationContext, storyId)
  
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, applicationContext)  
  
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

CliController.planStory =  async function(markdown, log) {
  consoleLog = log
  if (!markdown) markdown = await promptForMarkdownPlan()
  return await importMarkdown({
    projectPath: defaultProjectPath(),
    markdown,
    applicationContext
  })
}

CliController.startTask = async function (taskId, log) {
  consoleLog = log
  if (!taskId) {
    const storyId = await determineStoryId(applicationContext)
    taskId = await promptForTaskId(storyId)
  }

  if (!taskId) return log(chalk.bgRed('No tasks found!'))
  const project = await BacklogProject.createAndInit(defaultProjectPath(), null, applicationContext)
  await project.startTask(taskId)
}

CliController.showCurrentTask = async function (log) {
  consoleLog = log
  const { storyProject, task} = await getCurrentTask()
  if (!task) return noTaskStarted(log)
  log()
  logTask(log, storyProject, task)
}

CliController.completeTask = async function (log) {
  consoleLog = log
  const {storyProject, task} = await getCurrentTask()
  if (!task) return noTaskStarted(log)
  try {
    const task = await storyProject.completeTask()
    log()
    logTask(log, storyProject, task)
    log(chalk.bgGreen('Remember to commit and push!'))
  } catch (e) {
    log(chalk.bgRed(e.message))
  }
}

function noTaskStarted(log) {
  log('\n', chalk.bgRed('No task started!'))
}
function getTaskId(task) {
  const taskIdMeta = task.meta[TASK_ID]
  return taskIdMeta ? taskIdMeta[0] : null
}

async function getCurrentTask() {
  const backlogProject = await BacklogProject.createAndInit(defaultProjectPath(), null, applicationContext)
  const storyId = backlogProject.getCurrentStoryId()
  if (!storyId) return { backlogProject }
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, applicationContext)
  const task = await storyProject.getCurrentTask()
  return { backlogProject, storyProject, storyId, task }
}

async function determineStoryId(ApplicationContext, storyId) {
  const project = await BacklogProject.createAndInit(defaultProjectPath(), null, ApplicationContext)
  storyId = storyId || project.getCurrentStoryId()
  storyId = await promptForStoryId(storyId)
  return storyId
}

async function promptForStoryId(lastStoryId) {
  const backlogProject = new BacklogProject(defaultProjectPath(), null, applicationContext)
  await backlogProject.init()

  const storyIds = backlogProject.getStoryIds().filter(({list}) => list !== backlogProject.config.getDoneList())
  const choices = storyIds.map(({storyId, text}) => ({ title: `${text} [ ${storyId} ]`, value: storyId }))
  let initial = storyIds.findIndex(({storyId}) => storyId === lastStoryId)
  if (initial < 0) initial = 0
  const result = await prompts({
    type: 'select',
    name: 'storyId',
    message: 'Select a story',
    choices,
    initial
  })
  return result.storyId
}

async function promptForTaskId(storyId) {
  const storyProject = await StoryProject.createAndInit(defaultProjectPath(), null, storyId, applicationContext)
  const tasks = storyProject.getTasks(`list != ${storyProject.config.getDoneList()}`)
  const choices = tasks.map(({text, meta}) => ({ title: `${text} [ ${meta[TASK_ID]} ]`, value: meta[TASK_ID] }))
  const result = await prompts({
    type: 'select',
    name: 'taskId',
    message: 'Select a task',
    choices
  })
  return result.taskId
}

async function promptForDefaultBranch() {
  const branches = (await git.branchLocal()).all
  const initial = branches.includes('master') ? 'master' : 'main'
  const result = await prompts({
    type: 'text',
    name: 'defaultBranch',
    message: 'Enter the name of the default branch',
    initial
  })
  return result.defaultBranch
}

async function promptForRemote() {
  const remotes = (await git.getRemotes(true)).map(({name}) => ({title: name, value: name}))
  if (remotes.length === 1) return remotes[0].value
  if (remotes.length === 0) return

  const result = await prompts({
    type: 'select',
    name: 'remote',
    message: 'Select a remote',
    choices: remotes
  })
  return result.remote
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
  log('\n## Tasks\n')
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
