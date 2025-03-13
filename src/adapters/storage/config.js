import { readFile, writeFile, exists } from '../file-gateway'
import constants from '../../constants'
import { loadYAML, dumpYAML } from '../yaml'
import findUp from 'find-up'
import _path from 'path'
import { Config } from '../../config'

const { CONFIG_DIR, CONFIG_FILE_YML } = constants
export async function load(projectPath, configPath = _path.join(projectPath, CONFIG_FILE_YML)) {
  const configLike = await loadYamlConfig(configPath)
  return configLike && new Config(configLike)
}

export async function save(config, projectPath) {
  const configPath = _path.join(projectPath, CONFIG_FILE_YML)
  await writeFile(configPath, dumpYAML(config))
}

export async function loadForFilePath(filePath) {
  const projectPath = await findImdonePath(filePath)
  return load(projectPath)
}

export async function loadYamlConfig(filePath) {
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

export async function findImdonePath(cwd) {
  const configDir = await findUp(CONFIG_DIR, { cwd, type: 'directory' })
  return _path.dirname(configDir)
}

