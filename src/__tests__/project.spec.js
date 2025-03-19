import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { createFileSystemProject } from '../project-factory';
import { getFreshRepoTestData } from './helper';

const {rm} = fs.promises
describe('project', function () {
  let project, repo, defaultCardsDir

  beforeEach(async () => {
    defaultCardsDir = await getFreshRepoTestData('default-cards')
   
    project = createFileSystemProject({
      path: defaultCardsDir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {}
    })
    repo = project.repo
  })

  afterEach(async () => {
    project.destroy()
    await rm(defaultCardsDir, {recursive: true})
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
