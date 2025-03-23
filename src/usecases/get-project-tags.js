import { load } from '../adapters/storage/tags.js'
import { findImdonePath } from '../adapters/storage/config.js'

export async function getTags(filePath) {
  const projectPath = await findImdonePath(filePath)
  return await load(projectPath)
}