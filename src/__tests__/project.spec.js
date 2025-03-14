import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createFileSystemProject } from '../project-factory';

const {cp, rm, mkdir, access} = fs.promises
describe('project', function () {
  const tmpDir = path.join(process.cwd(), 'tmp')
  const tmpReposDir = path.join(tmpDir, 'repos')
  const repoSrc = path.join(process.cwd(), 'test', 'repos')
  const defaultCardsDir = path.join(tmpReposDir, 'default-cards')
  let project, repo

  beforeEach(async () => {
    try {
      await access(tmpDir)
      await rm(tmpDir, { recursive: true })
    } catch (e) {
      // swallow exception
    } finally {
      await mkdir(tmpDir)
      await cp(repoSrc, tmpReposDir, { recursive: true, force: true })
    }
    
    project = createFileSystemProject({
      path: defaultCardsDir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {}
    })
    repo = project.repo
  })

  afterEach(async () => {
    project.destroy()
    await rm(tmpDir, {recursive: true})
  })

  it('sorts according to due date when the default view filter has +dueDate', async function () {
    await project.init()
    project.defaultFilter = 'dueDate < "${tomorrow at 6AM}" AND list != DONE +dueDate +order'
    const imdoneJson = await project.toImdoneJSON()
    expect(imdoneJson.lists[2].tasks[0].text).to.equal('If you have any questions, feel free to reach out!')
    expect(imdoneJson.lists[2].tasks[11].text).to.equal('Get started with imdone')
  })

  describe('addTaskToFile', () => {
    it('adds a task to a file', async function () {
      await project.init()
      const { task } = await project.addTaskToFile({
        path: 'imdone-readme.md',
        list: 'TODO',
        content: 'New task'
      })
      expect(task.text).to.equal('New task')
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

      expect(task.text).to.equal('New task')
      expect(tasks[tasks.length - 1].text).to.equal('New task')})
  })
})
