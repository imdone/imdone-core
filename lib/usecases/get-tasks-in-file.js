const Config = require('../config')
const { getFileParser } = require('../adapters/parsers/file/LocalFileParserFactory')
const { Readable } = require('stream');

// DOING Use task line parsers for vs code extension and obsidian plugin
// <!--
// order:-10000030
// -->
export async function getTasks({filePath, content}) {
  const projectPath = await Config.findImdonePath(filePath)
  const config = await Config.load(projectPath)

  // create a readstream from the content and pass it to getFileParser
  const readStream = new Readable({
    read() {
      this.push(content);
      this.push(null); // Signals the end of the stream
    }
  });

  const parser = await getFileParser(filePath, config, readStream)

  const tasks = []
  let task = true
  while (task) {
    task = await parser.readTask()
    if (task) tasks.push(task)
  }
  parser.close()
  return tasks
}