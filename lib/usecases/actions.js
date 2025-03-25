import { createFileSystemProject } from '../project-factory.js';
import { load } from '../adapters/storage/config.js';

export async function executeBoardAction({projectPath, configPath, task, action}) {
  const path = projectPath;
  const config = await load(projectPath, configPath);
  const project = createFileSystemProject({ path, config });
  await project.init();
  await project.toImdoneJSON();
  const file = task && project.getFile(task.filePath);
  const activeTask = file && task.line > -1 && file.getTaskAtLine(task.line);
  await project.performBoardAction(action, activeTask);
}

export async function listAvailableActions(projectPath, configPath, plugin) {
  const _log = console.log
  console.log = () => {}
  console.warn = () => {}
  console.info = () => {}
  const path = projectPath;
  const config = await load(projectPath, configPath);
  const project = createFileSystemProject({ path, config });
  await project.init();
  await project.toImdoneJSON();
  _log('\nAvailable actions:');
  _log(JSON.stringify(project.boardActions, null, 2));
}