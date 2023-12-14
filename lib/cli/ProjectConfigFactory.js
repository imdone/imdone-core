const DefaultApplicationContext = require('./adapters/ApplicationContext')
const { loadYAML, dumpYAML } = require('../tools')
const Config = require('../config')
const { readFile, mkdir, cp, rm, writeFile, access } = require('fs').promises
const { resolve } = path = require('path')
const BacklogProject = require('./domain/BacklogProject')
const StoryProject = require('./domain/StoryProject')

const DEFAULT_PROJECT_DIR = 'backlog'
const STORIES_DIR = 'stories'
const TASKS_DIR = 'tasks'
const CONFIG_PATH = path.join(__dirname, '..', '..', 'devops', 'imdone')
const BACKLOG_CONFIG_PATH = path.join(CONFIG_PATH, 'backlog-config.yml')
const STORY_CONFIG_PATH = path.join(CONFIG_PATH, 'story-config.yml')
const BACKLOG_IGNORE_PATH = path.join(CONFIG_PATH, 'backlog.imdoneignore')

const defaultProjectPath = (baseDir = process.env.PWD) => path.join(baseDir, DEFAULT_PROJECT_DIR)

const getProjectConfigPath = (projectPath = defaultProjectPath()) => path.join(projectPath, '.imdone', 'config.yml')

const projectExists = async (
  projectPath = defaultProjectPath()
) => {
  const projectConfigPath = getProjectConfigPath(projectPath)
  try {
    await access(projectConfigPath)
    return projectConfigPath
  } catch (e) {
    return false
  }
}

const configureProject = async ({
  projectPath = defaultProjectPath(),
  configPath = BACKLOG_CONFIG_PATH,
  tasksDir = STORIES_DIR,
  defaultBranch,
  remote,
  name
}) => {
  projectPath = resolve(projectPath)
  configPath = resolve(configPath)

  if (await projectExists(projectPath)) {
    return { projectPath, config: await newConfigFromFile(projectConfigPath)}
  }

  const projectConfigPath = getProjectConfigPath(projectPath)

  await mkdir(path.join(projectPath, tasksDir), {recursive: true})
  await mkdir(path.join(projectPath, '.imdone'), { recursive: true })
  
  const config = await newConfigFromFile(configPath)
  const parentDir = path.basename(path.dirname(projectPath))
  config.name = name || `${parentDir} ${DEFAULT_PROJECT_DIR}`
  config.journalPath = tasksDir
  const pluginConfig = config.settings.plugins.CliBacklogPlugin
  config.settings.plugins.CliBacklogPlugin = {...pluginConfig, defaultBranch, remote}

  await writeFile(projectConfigPath, dumpYAML(config))
  return { projectPath, config }
}

const newBacklogProject = async ({
  projectPath = defaultProjectPath(),
  configPath = BACKLOG_CONFIG_PATH,
  tasksDir = STORIES_DIR,
  ApplicationContext = DefaultApplicationContext
}) => {
  try {
    await cp(BACKLOG_IGNORE_PATH, path.join(projectPath, '.imdoneignore'))
  } catch (e) {
    logFsError(ApplicationContext, e)
  }

  const { config } = projectConfig = await configureProject({projectPath, configPath, tasksDir})
  return new BacklogProject(projectConfig.projectPath, config, ApplicationContext)
}

const newStoryProject = async ({
  projectPath = defaultProjectPath(),
  configPath = STORY_CONFIG_PATH,
  tasksDir = TASKS_DIR,
  storyId,
  ApplicationContext = DefaultApplicationContext
}) => {
  const storyProjectPath = BacklogProject.getStoryProjectPath(projectPath, storyId)
  try {
    await rm(storyProjectPath, { recursive: true })
    await mkdir(storyProjectPath, { recursive: true })
  } catch (e) {
    logFsError(ApplicationContext, e)
  }
  const name = `${storyId} ${tasksDir}`
  const { config } = projectConfig = await configureProject({projectPath: storyProjectPath, configPath, tasksDir, name})
  return new StoryProject(projectPath, config, storyId, ApplicationContext)
}

async function newConfigFromFile(configPath) {
  const config = await readFile(configPath, 'utf8')
  return new Config(loadYAML(config))
}

function logFsError(ApplicationContext, e) {
  ApplicationContext().log(`${e.code}: ${e.path}`)
}

module.exports = {
  projectExists,
  configureProject,
  newBacklogProject,
  newStoryProject,
  defaultProjectPath
}