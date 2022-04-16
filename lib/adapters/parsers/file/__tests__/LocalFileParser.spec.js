const LocalFileParserFactory = require('../LocalFileParserFactory')
const constants = require('../../../../constants')
const Config = require('../../../../config')
const path = require('path')

describe('LocalFileParser', () => {
  describe('readTask', () => {
    it('reads a single task from a file', async () => {
      var config = new Config(constants.DEFAULT_CONFIG)
      const parser = LocalFileParserFactory.getFileParser(
        path.join(__dirname, 'test-big-file.md'),
        config
      )
      const task = await parser.readTask()
      parser.close()
      task.should.not.be.null()
    })

    it('parses a file', async () => {
      var config = new Config(constants.DEFAULT_CONFIG)
      const parser = LocalFileParserFactory.getFileParser(
        path.join(__dirname, 'test-big-file.md'),
        config
      )
      const tasks = []
      let task = true
      while (task) {
        task = await parser.readTask()
        if (task) tasks.push(task)
      }
      parser.close()
      tasks.length.should.be.exactly(629)
    })
  })
})
