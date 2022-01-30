const LocalFileParserFactory = require("../LocalFileParserFactory")
const constants = require('../../../../../constants')
const Config = require('../../../../../config')
const path = require('path')
const Task = require('../../../../../task')

describe('LocalFileParser', () => {
  it('parses a file', (done) => {
    var config = new Config(constants.DEFAULT_CONFIG);
    const parser = LocalFileParserFactory.getFileParser(path.join(__dirname, 'test-big-file.md'), config)
    const tasks = []
    parser.on('task', task => tasks.push(new Task(config, task)))
    parser.on('error', err => done(err))
    parser.on('done', () => {
      tasks.length.should.be.exactly(630)
      done()
    })
    parser.parse()
  })
})