require('colors')
const should = require('should')
const expect = require('expect.js')
const path = require('path')
const helper = require('./helper')
const Repository = require('../lib/repository')
const WatchedFsStore = require('../lib/mixins/repo-watched-fs-store')
const wrench = require('wrench')
const { load, dump } = require('js-yaml')
const { readFileSync, writeFileSync, existsSync, promises } = require('fs')
const Diff = require('diff')
const eol = require('eol')
const Project = require('../lib/project')

describe('WatchedFsStore', function () {
  let repo,
    proj,
    defaultCardsRepo,
    defaultCardsProj,
    repoSrc = path.join(process.cwd(), 'test', 'repos'),
    tmpDir = path.join(process.cwd(), 'tmp')
  ;(tmpReposDir = path.join(tmpDir, 'repos')),
    (defaultCardsDir = path.join(tmpReposDir, 'default-cards-metaSep'))

  beforeEach(function (done) {
    try {
      if (existsSync(tmpDir)) {
        wrench.rmdirSyncRecursive(tmpDir)
      }
      wrench.mkdirSyncRecursive(tmpDir)
      wrench.copyDirSyncRecursive(repoSrc, tmpReposDir)
    } catch (e) {
      return done(e)
    }

    repo = WatchedFsStore(new Repository(helper.getFreshRepo()))
    proj = new Project(repo)
    proj.pluginManager.loadPluginsNotInstalled = () => {}
    proj.pluginManager.loadInstalledPlugins = () => {}
    defaultCardsRepo = WatchedFsStore(new Repository(defaultCardsDir))
    defaultCardsProj = new Project(defaultCardsRepo)
    defaultCardsProj.pluginManager.loadPluginsNotInstalled = () => {}
    defaultCardsProj.pluginManager.loadInstalledPlugins = () => {}
    done()
  })

  afterEach(function (done) {
    setTimeout(() => {
      proj.destroy()
      defaultCardsProj.destroy()
      done()
    }, 500)
  })

  describe('init', function () {
    it("should initialize an imdone repo and emit it's lists", function (done) {
      repo.on('initialized', ({ ok, lists }) => {
        should(ok).be.true
        should(lists).be.an.object
        done()
      })
      proj.init()
    })
  })
  describe('watcher', function () {
    it.skip('should reload config and update metaSep', function (done) {
      defaultCardsRepo.once('config.update', ({ file }) => {
        const expected = readFileSync(
          path.join(process.cwd(), 'test', 'files', 'imdone-readme-metaSep.md')
        )
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const filePath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('imdone-readme.md')
        )
        const content = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const diff = Diff.diffChars(expected, content)
        if (content !== expected) {
          diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
            process.stderr.write(part.value[color])
          })
        }
        expect(content === expected).to.be(true)
        done()
      })
      defaultCardsProj.init(() => {
        console.log(defaultCardsRepo.initializingWatcher)
        const configPath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('.imdone/config.yml')
        )
        const config = load(readFileSync(configPath).toString())
        config.settings.cards.metaSep = '::'
        config.keepEmptyPriority = true
        writeFileSync(configPath, dump(config))
      })
    })
    it('should reload config and do nothing if metaSep is incorrect', function (done) {
      let filePath
      defaultCardsRepo.once('config.update', (data) => {
        const expected = readFileSync(
          path.join(
            process.cwd(),
            'test',
            'files',
            'imdone-readme-default-metaSep.md'
          )
        )
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const filePath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('imdone-readme.md')
        )
        const content = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const diff = Diff.diffChars(expected, content)
        if (content !== expected) {
          diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
            process.stderr.write(part.value[color])
          })
        }
        expect(content === expected).to.be(true)
        done()
      })
      defaultCardsProj.init(() => {
        filePath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('imdone-readme.md')
        )
        expected = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
        const configFile = path.join('.imdone', 'config.yml')
        const configPath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile(configFile)
        )
        const config = load(readFileSync(configPath).toString())
        config.settings.cards.metaSep = ':test:'
        config.keepEmptyPriority = true
        promises.writeFile(configPath, dump(config))
      })
    })
  })

  describe('resume', function() {
    this.timeout(20000)

    it('should refresh the repository when resumed', function(done) {
      const fs = require('fs')
      const testFilePath = path.join(repo.path, 'test-resume.md')

      proj.init(() => {
        // Create a test file
        fs.writeFileSync(testFilePath, '#TODO Test task before pause\nSome content')

        setTimeout(() => {
          const tasksBeforePause = repo.getTasks().length

          // Pause the repository
          repo.pause().then(() => {
            // Modify the file while paused
            fs.writeFileSync(testFilePath, '#TODO Test task after pause\nModified content\n\n#TODO Another task')

            setTimeout(() => {
              // The tasks should not have updated yet since we're paused
              const tasksDuringPause = repo.getTasks().length
              expect(tasksDuringPause).to.equal(tasksBeforePause)

              // Resume the repository - this should trigger a refresh
              repo.resume().then(() => {
                setTimeout(() => {
                  // Now the tasks should be updated
                  const tasksAfterResume = repo.getTasks()
                  expect(tasksAfterResume.length).to.be.greaterThan(tasksDuringPause)

                  // Verify we have the new tasks
                  const taskTexts = tasksAfterResume.map(t => t.text)
                  expect(taskTexts).to.contain('Test task after pause')
                  expect(taskTexts).to.contain('Another task')

                  // Clean up
                  fs.unlinkSync(testFilePath)
                  done()
                }, 1000)
              }).catch(done)
            }, 500)
          }).catch(done)
        }, 1000)
      })
    })

    it('should call refresh() when resumed', function(done) {
      const sinon = require('sinon')

      proj.init(() => {
        // Spy on the refresh method
        const refreshSpy = sinon.spy(repo, 'refresh')

        // Resume should call refresh
        repo.resume().then(() => {
          expect(refreshSpy.calledOnce).to.be(true)
          refreshSpy.restore()
          done()
        }).catch(done)
      })
    })
  })
})
