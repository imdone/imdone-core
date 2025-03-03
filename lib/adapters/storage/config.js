const { readFile, writeFile, exists } = require('../file-gateway')
const { CONFIG_DIR, CONFIG_FILE_YML } = require('../../constants')
const { loadYAML, dumpYAML } = require('../yaml')
const findUp = require('find-up')
const _path = require('path')
const Config = require('../../config')

module.exports = {
  load,
  save,
  loadForFilePath,
  findImdonePath,
  getYamlConfig
}

async function load(projectPath, configPath = _path.join(projectPath, CONFIG_FILE_YML)) {
  return getYamlConfig(configPath)
}

async function getYamlConfig(configPath) {
  const configLike = await loadYamlConfig(configPath)
  return configLike && new Config(configLike)
}

async function save(config, projectPath) {
  const configPath = _path.join(projectPath, CONFIG_FILE_YML)
  await writeFile(configPath, dumpYAML(config))
}

async function loadForFilePath(filePath) {
  const projectPath = await findImdonePath(filePath)
  return load(projectPath)
}

async function loadYamlConfig(filePath) {
  if (!(await exists(filePath))) return
  const configData = await readFile(filePath, 'utf-8')
  let configLike = {}
  try {
    configLike = loadYAML(configData.toString())
    if (configLike.exclude) delete configLike.exclude
    if (configLike.watcher) delete configLike.watcher

  } catch (e) {
    console.error(`Error parsing config file: ${filePath}`)
  }
  return configLike
}

async function findImdonePath(cwd) {
  const configDir = await findUp(CONFIG_DIR, { cwd, type: 'directory' })
  return _path.dirname(configDir)
}

