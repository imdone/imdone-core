const { loadForFilePath } = require('../adapters/storage/config')
const { getFileParser } = require('../adapters/parsers/file/LocalFileParserFactory')
const { Readable } = require('stream');

module.exports = {
  getTasks  
}

async function getTasks({filePath, content}) {
  const config = await loadForFilePath(filePath)

  const readStream = new Readable({
    read() {
      this.push(content);
      this.push(null);
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