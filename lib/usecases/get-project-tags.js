const {
  load
} = require('../adapters/storage/tags.js')

const {
  findImdonePath
} = require('../adapters/storage/config.js')

module.exports = {
  getTags
}

async function getTags(filePath) {
  const projectPath = await findImdonePath(filePath)
  return load(projectPath)
}