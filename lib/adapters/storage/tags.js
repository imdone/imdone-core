import { readFile, writeFile, exists } from '../file-gateway.js'
import { constants } from '../../constants.js'
const { CONFIG_DIR } = constants
import { loadYAML, dumpYAML } from '../yaml.js'
import _path from 'path'

export async function load(projectPath) {
  const tagsPath = getTagsPath(projectPath)
  if (!(await exists(tagsPath))) return
  const tagsData = await readFile(tagsPath, 'utf-8')
  try {
    const { tags } = loadYAML(tagsData)
    return tags
  } catch (e) {
    console.error(e)
    return
  }
}

export async function save(tags, projectPath) {
  await writeFile(getTagsPath(projectPath), dumpYAML({ tags }))
}

function getTagsPath(projectPath) {
  return _path.join(projectPath, CONFIG_DIR, 'tags.yml')
}
