const { readFile, writeFile, exists } = require('../file-gateway')
const { CONFIG_DIR } = require('../../constants')
const { loadYAML, dumpYAML } = require('../yaml')
const _path = require('path')

module.exports = {
  load,
  save
}

async function load(projectPath) {
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

async function save(tags, projectPath) {
  await writeFile(getTagsPath(projectPath), dumpYAML({ tags }))
}

function getTagsPath(projectPath) {
  return _path.join(projectPath, CONFIG_DIR, 'tags.yml')
}
