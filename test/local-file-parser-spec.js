const LocalFileParserFactory = require("../lib/parsers/file/LocalFileParserFactory")
const constants = require('../lib/constants')
const Config = require('../lib/config')
const path = require('path')

describe('LocalFileParser', () => {
  it('parses a file', (done) => {
    var config = new Config(constants.DEFAULT_CONFIG);
    const parser = LocalFileParserFactory.getFileParser(path.join(__dirname, 'test-big-file.md'), config)
    let counter = 0
    parser.on('task', (task) => {
      counter++
    })
    parser.on('error', err => done(err))
    parser.on('done', () => {
      counter.should.be.exactly(630)
      done()
    })
    parser.parse()
  })
})