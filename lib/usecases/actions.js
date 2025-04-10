import { createFileSystemProject } from '../project-factory.js';
import { load } from '../adapters/storage/config.js';
import { logger } from '../adapters/logger.js';

/**
 * Initializes and returns a project instance.
 * @param {string} projectPath - The path to the project.
 * @param {string} configPath - The path to the configuration file.
 * @returns {Promise<Object>} - The initialized project instance.
 */
async function initializeProject(projectPath, configPath) {
  const path = projectPath;
  const config = await load(projectPath, configPath);
  const project = createFileSystemProject({ path, config });
  await project.init();
  await project.toImdoneJSON();

  return project;
}

export async function executeBoardAction({ projectPath, configPath, task, action }) {
  const project = await initializeProject(projectPath, configPath);
  const file = task && project.getFile(task.filePath);
  const activeTask = file && task.line > -1 && file.getTaskAtLine(task.line);
  await project.performBoardAction(action, activeTask);
}

export async function listAvailableActions(projectPath, configPath, plugin) {
  const project = await initializeProject(projectPath, configPath);
  logger.log('\nAvailable actions:');
  logger.log(JSON.stringify(project.boardActions, null, 2));
}