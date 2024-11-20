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
    
    project = createFileSystemProject({path: defaultCardsDir})
    repo = project.repo
    done()
  })

  afterEach((done) => {
    project.destroy()
    wrench.rmdirSyncRecursive(tmpDir, true)
    done()
  })

  it('sorts according to due date when the default view filter has +dueDate', async function () {
    await project.init()
    project.defaultFilter = 'dueDate < "${tomorrow at 6AM}" AND list != DONE +dueDate +order'
    const imdoneJson = await project.toImdoneJSON()
    expect(imdoneJson.lists[2].tasks[0].text).to.be('If you have any questions, feel free to reach out!')
    expect(imdoneJson.lists[2].tasks[11].text).to.be('Get started with imdone')
  })

  describe('addTaskToFile', () => {
    it('adds a task to a file', async function () {
      await project.init()
      const { task } = await project.addTaskToFile({
        path: 'imdone-readme.md',
        list: 'TODO',
        content: 'New task'
      })
      expect(task.text).to.be('New task')
    })
    it('adds a task to a file and moves it to the bottom of the list', async function () {
      await project.init()
      project.config.settings.cards.addNewCardsToTop = false
      const list = 'TODO'
      const { task } = await project.addTaskToFile({
        path: 'imdone-readme.md',
        list,
        content: 'New task'
      })
      const todoList = project.lists.find(l => l.name === list)
      const tasks = todoList.tasks

      expect(task.text).to.be('New task')
      expect(tasks[tasks.length - 1].text).to.be('New task')})
  })
})
