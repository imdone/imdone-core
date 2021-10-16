require('colors')
const should  = require('should')
const expect = require('expect.js')
const sinon  = require('sinon')
const path = require('path')
const helper = require('./helper')
const Repository = require('../lib/repository')
const WatchedFsStore = require('../lib/mixins/repo-watched-fs-store')
const wrench = require('wrench')
const { load, dump } = require('js-yaml')
const { readFileSync, writeFileSync, existsSync } = require('fs')
const Task = require('../lib/task')
const File = require('../lib/file')
const Diff = require('diff')
const eol = require('eol')

describe('WatchedFsStore', function () {
  let repo,
  defaultCardsRepo,
  repoSrc  = path.join(process.cwd(), "test", "repos"),
  tmpDir = path.join(process.cwd(), "tmp")
  tmpReposDir = path.join(tmpDir, "repos"),
  defaultCardsDir = path.join(tmpReposDir, 'default-cards-metaSep')
  
  beforeEach(function (done) {
    try {
      if (existsSync(tmpDir))  {
        wrench.rmdirSyncRecursive(tmpDir)
      }
      wrench.mkdirSyncRecursive(tmpDir);
      wrench.copyDirSyncRecursive(repoSrc, tmpReposDir);
    } catch (e) {
      return done(e)
    }

    repo = WatchedFsStore(new Repository(helper.getFreshRepo()))
    defaultCardsRepo = WatchedFsStore(new Repository(defaultCardsDir))
    done()
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
      defaultCardsRepo.once('config.update', ({file}) => {
        const expected = readFileSync(path.join(process.cwd(), 'test', 'files', 'imdone-readme-metaSep.md'))
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const filePath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('imdone-readme.md'))
        const content = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const diff = Diff.diffChars(expected, content);
        if (content !== expected) {
          diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const color = part.added ? 'green' :
              part.removed ? 'red' : 'grey';
            process.stderr.write(part.value[color]);
          });
        }
        expect(content === expected).to.be(true)
        done()
      })
      defaultCardsRepo.init(() => {
        console.log(defaultCardsRepo.initializingWatcher)
        const configPath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('.imdone/config.yml'))
        const config = load(readFileSync(configPath).toString())
        config.settings.metaSep = '::'
        config.keepEmptyPriority = true
        writeFileSync(configPath, dump(config))
      })
    })
    it('should reload config and do nothing if metaSep is incorrect', function(done) {
      let filePath
      let expected
      defaultCardsRepo.on('config.update', data => {
        const expected = readFileSync(path.join(process.cwd(), 'test', 'files', 'imdone-readme-default-metaSep.md'))
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const filePath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('imdone-readme.md'))
        const content = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const diff = Diff.diffChars(expected, content);
        if (content !== expected) {
          diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const color = part.added ? 'green' :
              part.removed ? 'red' : 'grey';
            process.stderr.write(part.value[color]);
          });
        }
        expect(content === expected).to.be(true)
        done()
      })
      defaultCardsRepo.init(() => {
        filePath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('imdone-readme.md'))
        expected = readFileSync(filePath).toString().split(eol.lf).filter((l, i) => i !== 23)
        const configPath = defaultCardsRepo.getFullPath(defaultCardsRepo.getFile('.imdone/config.yml'))
        const config = load(readFileSync(configPath).toString())
        config.settings.metaSep = ':test:'
        config.keepEmptyPriority = true
        writeFileSync(configPath, dump(config))
      })
    })
  })
})
