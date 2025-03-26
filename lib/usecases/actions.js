import { createFileSystemProject } from '../project-factory.js';
import { load } from '../adapters/storage/config.js';

/**
 * Initializes and returns a project instance.
 * @param {string} projectPath - The path to the project.
 * @param {string} configPath - The path to the configuration file.
 * @returns {Promise<Object>} - The initialized project instance.
 */
async function initializeProject(projectPath, configPath) {
  const _log = console.log;
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};

  const path = projectPath;
  const config = await load(projectPath, configPath);
  const project = createFileSystemProject({ path, config });
  await project.init();
  await project.toImdoneJSON();

  console.log = _log;
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
  console.log('\nAvailable actions:');
  console.log(JSON.stringify(project.boardActions, null, 2));
}