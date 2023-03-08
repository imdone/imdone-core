const { afterEach } = require('mocha')
const path = require('path')
const wrench = require('wrench')
const fs = require('fs')
const { createFileSystemProject } = require('../lib/project-factory')
const expect = require('expect.js')
describe('project', function () {
  const tmpDir = path.join(process.cwd(), 'tmp')
  const tmpReposDir = path.join(tmpDir, 'repos')
  const repoSrc = path.join(process.cwd(), 'test', 'repos')
  const defaultCardsDir = path.join(tmpReposDir, 'default-cards')
  let repo
  let project

  beforeEach((done) => {
    try {
      if (fs.existsSync(tmpDir)) {
        wrench.rmdirSyncRecursive(tmpDir)
      }
      wrench.mkdirSyncRecursive(tmpDir)
    } catch (e) {
      return done(e)
    }
    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, { forceDelete: true })
    
    project = createFileSystemProject(defaultCardsDir)
    repo = project.repo
    done()
  })

  afterEach((done) => {
    project.destroy()
    wrench.rmdirSyncRecursive(tmpDir, true)
    done()
  })

  it('sorts according to due date when the default view filter has +list', function (done) {
    project.init((err, files) => {
      if (err) return done(err)
      const imdoneJson = project.toImdoneJSON()
      expect(imdoneJson.lists[2].tasks[0].text).to.be('Add and Edit Cards')
      expect(imdoneJson.lists[2].tasks[12].text).to.be('Read the documentation')
      done()
    })
  })
})
