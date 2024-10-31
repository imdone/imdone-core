const languages = require('../languages') 
const Config = require('../config')
const File = require('../file')
const pluginManager = {
  onTaskUpdate: () => {},
  getCardProperties: () => { return {} },
  getCardActions: () => [],
}

// DOING Use task line parsers for vs code extension and obsidian plugin
// <!--
// order:-10000030
// -->
export async function getTasks({filePath, content}) {
  const projectPath = await Config.findImdonePath(filePath)
  const config = await Config.load(projectPath)
  const project = { path: projectPath, config, pluginManager }
  // var file = new File({
  //   repoId: projectPath,
  //   filePath,
  //   content,
  //   languages,
  //   project,
  // })

  // return file.extractTasks(config).getTasks()
}