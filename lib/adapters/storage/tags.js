import { readFile, writeFile, exists } from '../file-gateway.js'
import { constants } from '../../constants.js'
const { CONFIG_DIR } = constants
import { loadYAML, dumpYAML } from '../yaml.js'
import _path from 'path'
import { logger } from '../logger.js'

export const TAGS_FILE_PATH = _path.join(CONFIG_DIR, 'tags.yml')

export async function load(projectPath) {
  const tagsPath = getTagsPath(projectPath)
  if (!(await exists(tagsPath))) return
  const tagsData = await readFile(tagsPath, 'utf-8')
  try {
    const { tags } = loadYAML(tagsData)
    return tags
  } catch (e) {
    logger.error(e)
    return
  }
}

export async function save(tags, projectPath) {
  await writeFile(getTagsPath(projectPath), dumpYAML({ tags }))
}

function getTagsPath(projectPath) {
  return _path.join(projectPath, TAGS_FILE_PATH)
}
