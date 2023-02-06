const LocalFileParserFactory = require('../LocalFileParserFactory')
const constants = require('../../../../constants')
const Config = require('../../../../config')
const ApplicationContext = require('../../../../context/ApplicationContext')
const path = require('path')

describe('LocalFileParser', () => {
  describe('readTask', () => {
    it('reads a single task from a file', async () => {
      var config = Config.newDefaultConfig()
      ApplicationContext.config = config
      const parser = await LocalFileParserFactory.getFileParser(
        path.join(__dirname, 'test-big-file.md')
      )
      const task = await parser.readTask()
      parser.close()
      task.should.not.be.null()
    })

    it('parses a file', async () => {
      var config = Config.newDefaultConfig()
      ApplicationContext.config = config
      const parser = await LocalFileParserFactory.getFileParser(
        path.join(__dirname, 'test-big-file.md')
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

    it('parses a file with a checkbox task', async () => {
      var config = Config.newDefaultConfig()
      config.settings = {
        cards: {
          addCheckBoxTasks: true,
        },
      }
      ApplicationContext.config = config
      const parser = await LocalFileParserFactory.getFileParser(
        path.join(__dirname, 'test-big-file.md')
      )
      const tasks = []
      let task = true
      while (task) {
        task = await parser.readTask()
        if (task) tasks.push(task)
      }
      parser.close()
      tasks.length.should.be.exactly(630)
    })

    it('Reads a single task from a code file', async () => {
      var config = Config.newDefaultConfig()
      ApplicationContext.config = config
      const parser = await LocalFileParserFactory.getFileParser(
        path.join(__dirname, 'code-file.js')
      )
      const task = await parser.readTask()
      parser.close()
      task.should.not.be.null()
    })
  })
})
