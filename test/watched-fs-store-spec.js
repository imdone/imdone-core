const should  = require('should')
const expect = require('expect.js')
const sinon  = require('sinon')
const path = require('path')
const helper = require('./helper')
const Repository = require('../lib/repository')
const WatchedFsStore = require('../lib/mixins/repo-watched-fs-store')
const { load, dump } = require('js-yaml')
const { readFileSync, writeFileSync } = require('fs')
const Task = require('../lib/task')
const File = require('../lib/file')

describe('WatchedFsStore', function () {
  let repo,
  defaultCardsRepo,
  tmpDir = path.join(process.cwd(), "tmp")
  tmpReposDir = path.join(tmpDir, "repos"),
  defaultCardsDir = path.join(tmpReposDir, 'default-cards-metaSep')
  
  beforeEach(function () {
    repo = WatchedFsStore(new Repository(helper.getFreshRepo()))
    defaultCardsRepo = WatchedFsStore(new Repository(defaultCardsDir))
  })

  afterEach(function (done) {
    setTimeout(() => {
      repo.destroy()
      defaultCardsRepo.destroy()
      done()
    }, 500)
  })

  describe('init', function () {
    it('should initialize an imdone repo and emit it\'s lists', function(done) {
      repo.on('initialized', ({ok, lists}) => {
        should(ok).be.true
        should(lists).be.an.object
        done()
      })
      repo.init()
    })
  })
  describe('watcher', function () {
    it('should reload config and update metaSep', function(done) {
      defaultCardsRepo.on('initialized', ({ok, lists}) => {
        should(ok).be.true
        const configPath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('.imdone/config.yml'))
        const config = load(readFileSync(configPath).toString())
        config.settings.metaSep = '::'
        writeFileSync(configPath, dump(config))
      })
      defaultCardsRepo.on('config.update', data => {
        const expected = readFileSync(path.join(process.cwd(), 'test', 'files', 'imdone-readme-metaSep.md')).toString()
        const filePath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('imdone-readme.md'))
        const content = readFileSync(filePath).toString()
        expect(content).to.equal(expected)
        done()
      })
      defaultCardsRepo.init()
    })
    it('should reload config and do nothing if metaSep is incorrect', function(done) {
      let filePath
      let expected
      defaultCardsRepo.on('initialized', ({ok, lists}) => {
        should(ok).be.true
        filePath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('imdone-readme.md'))
        expected = readFileSync(filePath).toString()
        const configPath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('.imdone/config.yml'))
        const config = load(readFileSync(configPath).toString())
        config.settings.metaSep = ':test:'
        writeFileSync(configPath, dump(config))
      })
      defaultCardsRepo.on('config.update', data => {
        const content = readFileSync(filePath).toString()
        expect(content).to.equal(expected)
        done()
      })
      defaultCardsRepo.init()
    })
  })
})
