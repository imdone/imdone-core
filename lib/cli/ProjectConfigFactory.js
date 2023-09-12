const { mkdir, cp } = require('fs/promises')
const { resolve } = path = require('path')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')

const DEFAULT_PROJECT_DIR = 'backlog'
const STORIES_DIR = 'stories'
const TASKS_DIR = 'tasks'
const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'config.yml')
const CARD_PROPERTIES_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'properties')
const ACTIONS_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone', 'actions')

const defaultProjectPath = path.join(process.env.PWD, DEFAULT_PROJECT_DIR)

const configureProject = async ({
  projectPath = defaultProjectPath,
  configPath = DEFAULT_CONFIG_PATH,
  tasksDir = STORIES_DIR,
}) => {
  projectPath = resolve(projectPath)
  configPath = resolve(configPath)

  await cp(CARD_PROPERTIES_PATH, path.join(projectPath, '.imdone', 'properties'), { recursive: true })
  await cp(ACTIONS_PATH, path.join(projectPath, '.imdone', 'actions'), { recursive: true })
  await mkdir(path.join(projectPath, tasksDir), {recursive: true})
  
  const config = await newConfigFromFile(configPath)
  config.name = path.basename(projectPath)
  config.journalPath = tasksDir
  return { projectPath, config }
}

const newBacklogProject = async ({
  projectPath = defaultProjectPath,
  configPath = DEFAULT_CONFIG_PATH,
  tasksDir = STORIES_DIR,
  ApplicationContext = require('./domain/adapters/ApplicationContext')
}) => {
  const { projectPath, config } = await configureProject({projectPath, configPath, tasksDir})
  return new BacklogProject(projectPath, config, ApplicationContext)
}

const newStoryProject = async ({
  projectPath = defaultProjectPath,
  configPath = DEFAULT_CONFIG_PATH,
  tasksDir = TASKS_DIR,
  storyId,
  ApplicationContext = require('./domain/adapters/ApplicationContext')
}) => {
  projectPath = StoryProject.getStoryProjectPath(projectPath, storyId)
  try {
    await rm(projectPath, { recursive: true })
    await mkdir(projectPath, { recursive: true })
  } catch (e) {
    log(`${e.code}: ${e.path}`)
  }
  const tasksDir = TASKS_DIR  
  const { projectPath, config } = await configureProject({projectPath, configPath, tasksDir})
  return new StoryProject(projectPath, config, storyId, ApplicationContext)
}

module.exports = {
  newBacklogProject,
  newStoryProject,
}