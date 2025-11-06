// Create a function that gets a project with exactly one file
// Use findImdonePath in lib/adapters/storage/config.js
// Create a function that loads the project from that path
import { findImdonePath } from '../adapters/storage/config.js'
import { createFileSystemProjectWithFile } from '../project-factory.js'

export async function getProjectWithFile(filePath, { loadInstalledPlugins, loadPluginsNotInstalled } = {}) {
  const projectPath = await findImdonePath(filePath)
  if (!projectPath) {
    throw new Error('Project not found')
  }

  return createFileSystemProjectWithFile({ path: projectPath, filePath, loadInstalledPlugins, loadPluginsNotInstalled  })
}
