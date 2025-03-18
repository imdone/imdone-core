import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Project from '../project'
import List from '../list'
import Repository from '../repository'
import { Config } from '../config'
import File from '../file'
import Task from '../task';
import path from 'path'
import { rm, cp, mkdir, access } from 'fs/promises'
import { exists } from '../adapters/file-gateway'
import fsStore from '../mixins/repo-fs-store'
import languages from '../languages'
import eol from 'eol'
import { createFileSystemProject } from '../project-factory'
import appContext from '../context/ApplicationContext'
import { ProjectContext } from '../ProjectContext';
import { getFreshRepoTestData } from './helper';

// READY Continue migrating repository-spec.js
// Next migrate other tests
// <!--
// #esm-migration
// order:-235
// -->

const { parseHideListsFromQueryString } = Repository

describe('Repository', function () {
  var repoDir,
    repo1Dir,
    repo2Dir,
    repo3Dir,
    defaultCardsDir,
    defaultCards2Dir,
    noOrderRepoDir,
    moveMetaOrderDir,
    moveMetaOrderKeepEmptyPriorityDir,
    metaSepTestDir,
    repo,
    repo1,
    repo2,
    repo3,
    defaultCardsRepo,
    noOrderRepo,
    moveMetaOrderRepo,
    metaSepTestRepo,
    configDir,
    proj,
    proj1,
    proj2,
    proj3,
    defaultCardsProj,
    noOrderProj,
    moveMetaOrderProj,
    metaSepTestProj

  beforeEach(async function () {
    repoDir = await getFreshRepoTestData('files')
    repo1Dir = await getFreshRepoTestData('repo1')
    repo2Dir = await getFreshRepoTestData('repo2')
    repo3Dir = await getFreshRepoTestData('repo3')
    defaultCardsDir = await getFreshRepoTestData('default-cards')
    defaultCards2Dir = await getFreshRepoTestData('default-cards-2')
    noOrderRepoDir = await getFreshRepoTestData('no-order-repo')
    moveMetaOrderDir = await getFreshRepoTestData('move-meta-order')
    moveMetaOrderKeepEmptyPriorityDir = await getFreshRepoTestData('move-meta-order-keep-empty-priority')
    metaSepTestDir = await getFreshRepoTestData('meta-sep-test')

    appContext().pluginRegistry = { getAvailablePlugins: async () => [] }

    proj = createFileSystemProject({
      path: repoDir,
      config: Config.newDefaultConfig(),
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo = proj.repo
    configDir = path.join(repo.getPath(), '.imdone')

    repo1 = fsStore(new Repository(repo1Dir))
    proj1 = new Project(repo1)
    repo2 = fsStore(new Repository(repo2Dir))
    proj2 = new Project(repo2)
    repo3 = fsStore(new Repository(repo3Dir))
    proj3 = new Project(repo3)
    defaultCardsRepo = fsStore(new Repository(defaultCardsDir))
    defaultCardsProj = new Project(defaultCardsRepo)
    noOrderRepo = fsStore(new Repository(noOrderRepoDir))
    noOrderProj = new Project(noOrderRepo)
    moveMetaOrderRepo = fsStore(new Repository(moveMetaOrderDir))
    moveMetaOrderProj = new Project(moveMetaOrderRepo)
    metaSepTestRepo = fsStore(new Repository(metaSepTestDir))
    metaSepTestProj = new Project(metaSepTestRepo)
  })

  afterEach(async function () {
    // repo.destroy()
    proj1.destroy()
    proj2.destroy()
    proj3.destroy()
    proj.destroy()
    defaultCardsProj.destroy()
    noOrderProj.destroy()
    moveMetaOrderProj.destroy()
    metaSepTestProj.destroy()
  })

  it('Should init successfully', async () => {
    const files = await proj.init()
    expect(files.length).to.equal(15)
  })

  it('Should write and delete a file successfully', async function () {
    proj1 = createFileSystemProject({
      path: repo1Dir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo1 = proj1.repo
    const files = await proj1.init()
    expect(files.length).to.equal(4)
    var file = new File({
      repoId: repo1.getId(),
      filePath: 'test.md',
      content: '[Add some content](#DONE:0)',
      languages: languages,
      project: repo1.project,
    })
    await repo1.writeAndExtract(file, false)
    expect(file.tasks.length).to.equal(1)
    await repo1.deleteFile(file.path)
    expect(repo1.files.length).toBe(4)
  })

  it('Should write and delete a file in a sub-dir successfully', async () => {
    proj1 = createFileSystemProject({
      path: repo1Dir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo1 = proj1.repo
    const files = await proj1.init()
    expect(files.length).to.equal(4)
    
    var file = new File({
      repoId: repo1.getId(),
      filePath: 'some-dir/some-dir2/test.md',
      content: '[Add some content](#DONE:0)',
      languages: languages,
      project: repo1.project,
    })
    await repo1.writeAndExtract(file, false)
    expect(file.tasks.length).to.equal(1)
    
    await repo1.deleteFile(file.path)
    expect(repo1.files.length).to.equal(4)
  })

  it('Should find checkBox tasks', async () => {
    const config = Config.newDefaultConfig()
    config.settings = {
      newCardSyntax: 'MARKDOWN',
      cards: {
        doneList: 'DONE',
        defaultList: 'TODO',
        addCheckBoxTasks: true,
        metaNewLine: true,
        trackChanges: true,
      },
    }
    proj = createFileSystemProject({
      path: repoDir,
      config,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo = proj.repo

    const files = await proj.init()
    const file = files.find((file) => file.path === 'checkbox-tasks.md')
    expect(file.tasks[1].text).to.equal('A checkbox task without a list')
    expect(repo.files.length).to.equal(15)
  })

  describe('Repository.query', function () {
    it('Should should sort according to sort values', async () => {
      proj2 = createFileSystemProject({
        path: repo2Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo2 = proj2.repo
      
      await proj2.init()
      
      const tasks = Repository.query(repo2.getTasks(), 'list != OKAY +list')
      expect(tasks[0].list).to.equal('DOING')
      expect(tasks[1].list).to.equal('DOING')
      expect(tasks[2].list).to.equal('DOING')
      expect(tasks[3].list).to.equal('DONE')
      expect(tasks[4].list).to.equal('TODO')
      expect(tasks[5].list).to.equal('TODO')
      expect(tasks[6].list).to.equal('TODO')
    })
  })

  describe('hasDefaultFile', () => {
    beforeEach(async () => {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
    })
    it('Should return false if no default file exists', async () => {
      await proj.init()
      expect(repo.hasDefaultFile()).to.be.false
    })

    it('Should return true if readme.md file exists', async () => {
      await proj.init()
      var file = new File({
        repoId: repo.getId(),
        filePath: 'reADmE.md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo.project,
      })
      file = await repo.writeAndExtract(file, false)
      expect(repo.hasDefaultFile()).to.be.true

      await repo.deleteFile(file.path)
      expect(repo.hasDefaultFile()).to.be.false
    })

    it('Should return true if home.md file exists', async () => {
      await proj.init()
      var file = new File({
        repoId: repo.getId(),
        filePath: 'hOmE.Md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo.project,
      })
      await repo.writeAndExtract(file, false)
      expect(repo.hasDefaultFile()).to.be.true

      await repo.deleteFile(file.path)
      expect(repo.hasDefaultFile()).to.be.false
    })
  })

  describe('getDefaultFile', () => {
    beforeEach(function () {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
    })
    
    it("should return undefined if a default file doesn't exist", async () => {
      await proj.init()
      expect(repo.getDefaultFile()).toBeUndefined()
    })

    it('should return readme.md if it exist', async () => {
      await proj.init()
      var file = new File({
        repoId: repo.getId(),
        filePath: 'reADmE.md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo.project,
      })
      file = await repo.writeAndExtract(file, false)
      expect(repo.getDefaultFile()).to.equal(file)

      await repo.deleteFile(file.path)
      expect(repo.getDefaultFile()).toBeUndefined()
    })

    it('should return home.md if it exist', async () => {
      await proj.init()
      var file = new File({
        repoId: repo.getId(),
        filePath: 'hOmE.Md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo.project,
      })
      file = await repo.writeAndExtract(file, false)
      expect(repo.getDefaultFile()).to.equal(file)

      await repo.deleteFile(file.path)
      expect(repo.getDefaultFile()).toBeUndefined()
    })

    it('Should return readme.md if both home.md and readme.md exist', async () => {
      await proj.init()
      var home = new File({
        repoId: repo.getId(),
        filePath: 'hOmE.Md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo.project,
      })
      var readme = new File({
        repoId: repo.getId(),
        filePath: 'reADmE.Md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo.project,
      })

      home = await repo.writeAndExtract(home, false)
      expect(repo.getDefaultFile()).to.equal(home)

      readme = await repo.writeAndExtract(readme, false)
      expect(repo.getDefaultFile()).to.equal(readme)

      await repo.deleteFile(readme.path)
      expect(repo.getDefaultFile()).to.equal(home)

      await repo.deleteFile(home.path)
      expect(repo.getDefaultFile()).toBeUndefined()
    })
  })

  describe('saveConfig', function () {
    it('Should save the config file', async () => {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
      await repo.saveConfig()
      expect(await exists(configDir)).to.be.true
      await rm(configDir, { recursive: true, force: true })
      expect(await exists(configDir)).to.be.false
    })
  })

  describe('toggleList', function () {
    it('Should toggle the list', async () => {
      await proj.init()
      await repo.toggleList('TODO')
      expect(repo.getList('TODO').hidden).to.be.true
      await repo.toggleList('TODO')
      expect(repo.getList('TODO').hidden).to.be.false
    })
  })

  describe('toggleListIgnore', function () {
    it('Should toggle the list ignore', async function () {
      await proj.init()
      await repo.toggleListIgnore('TODO')
      expect(repo.getList('TODO').ignore).to.be.true
      await repo.toggleListIgnore('TODO')
      expect(repo.getList('TODO').ignore).to.be.false
    })
  })

  describe('loadConfig', function () {
    it('Should load the config file', async () => {
      appContext().projectContext = new ProjectContext(repo)
      repo.config = Config.newDefaultConfig()
      repo.config.foo = 'bar'
      await repo.saveConfig()
      expect(await exists(configDir)).to.be.true
      await repo.loadConfig()
      expect(repo.config.foo).to.equal('bar')
      await rm(configDir, { recursive: true, force: true })
      expect(await exists(configDir)).to.be.false
    })
  })

  describe('updateList', function () {
    beforeEach(function () {
      proj1 = createFileSystemProject({
        path: repo1Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo1 = proj1.repo
    })
    it('should modify the list name', async () => {
      await proj1.init()
      const todo = repo1.getList("TODO")
      const updatedList = {...todo, name: "PLANNING"}
      expect(repo1.getTasksInList('TODO').length).to.equal(3)
      await repo1.updateList(updatedList.id, updatedList)
      expect(repo1.getTasksInList('PLANNING').length).to.equal(3)
      expect(repo1.getTasksInList('TODO').length).to.equal(0)
    })

    it('should modify the list filter', async function () {
      await proj1.init()
      const bareList = {name: "Filtered", filter: "text = /task/", id: "filtered"}     
      const filtered = new List(bareList)
      await repo1.addList(filtered)
      const { lists } = await proj1.toImdoneJSON()
      expect(lists.find(list => list.id === filtered.id).tasks.length).to.equal(6)
      await repo1.updateList(filtered.id, {...bareList, filter: "text = /tasks/"})
      const updatedLists = (await proj1.toImdoneJSON()).lists
      expect(updatedLists.find(list => list.id === filtered.id).tasks.length).to.equal(0)
    })
  })

  describe('deleteTasks', () => {
    beforeEach(function () {
      proj3 = createFileSystemProject({
        path: repo3Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo3 = proj3.repo
    })

    it('deletes all tasks', async () => {
      await proj3.init()
      var tasks = repo3.getTasks()
      await repo3.deleteTasks(tasks)
      var tasksNow = repo3.getTasks()
      expect(tasksNow.length).to.equal(0)
    })

    it('deletes all tasks in a list', async () => {
      await proj3.init()
      var todos = repo3.getTasksInList('TODO')
      await repo3.deleteTasks(todos)
      var todosNow = repo3.getTasksInList('TODO')
      expect(todosNow.length).to.equal(0)
    })

    it('deletes all tasks that match a filter', async () => {
      const project = createFileSystemProject({
        path: defaultCards2Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      const repo = project.repo
      await project.init()
      const cards = project.getCards('cards')
      await repo.deleteTasks(cards)
      var cardsNow = project.getCards('cards')
      expect(cardsNow.length).to.equal(0)
      expect(project.getCards().length).to.equal(8)
    })
  })

  describe('deleteTask', () => {
    beforeEach(function () {
      proj3 = createFileSystemProject({
        path: repo3Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo3 = proj3.repo
    })
    it('deletes a task with blank lines', async () => {
      await proj3.init()
      var doing = repo3.getTasksInList('DOING')
      var taskToDelete = doing.find(
        (task) => task.meta.id && task.meta.id[0] === '7'
      )
      await repo3.deleteTask(taskToDelete)
      var todo = repo3.getTasksInList('DOING')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '7'
      )
      expect(taskToDelete).to.equal(undefined)
    })
    it('deletes a block comment task on a single line', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '0'
      )
      await repo3.deleteTask(taskToDelete)
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '0'
      )
      expect(taskToDelete).to.equal(undefined)
    })
    it('deletes a TODO that starts on the same line as code', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '1'
      )
      await repo3.deleteTask(taskToDelete)
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '1'
      )
      expect(taskToDelete).to.equal(undefined)
    })
    it('deletes a TODO in a block comment', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '2'
      )
      await repo3.deleteTask(taskToDelete)
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '2'
      )
      expect(taskToDelete).to.equal(undefined)
    })

    it('deletes a TODO in a block comment on the same lines', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '3'
      )
      await repo3.deleteTask(taskToDelete)
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '3'
      )
      expect(taskToDelete).to.equal(undefined)
    })
    it('deletes a TODO with single line comments', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '4'
      )
      await repo3.deleteTask(taskToDelete)
      var todo = repo3.getTasksInList('TODO')
      var taskToDelete = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '4'
      )
      expect(taskToDelete).to.equal(undefined)
    })
    it('deletes all TODOs in a file', async () => {
      await proj3.init()
      var todos = repo3.getTasksInList('TODO')
      while (todos.length > 0) {
        let task = todos.pop()
        const file = repo3.getFileForTask(task)
        if (!file) {
          return next()
        }
        await repo3.deleteTask(task)
        await repo3.readFile(file)
        var todo = repo3.getTasksInList('TODO')
        expect(todo.length).to.equal(todos.length)
        todos = repo3.getTasksInList('TODO')
      }
    })
  })


  describe('modifyFromContent', () => {
    beforeEach(function () {
      proj3 = createFileSystemProject({
        path: repo3Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo3 = proj3.repo
    })
    it('modifies a description on a single line block comment', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '0'
      )
      expect(taskToModify.description.length).to.equal(3)
      const content = `${taskToModify.text}
- description line 1
- description line 2`
      await repo3.modifyTaskFromContent(taskToModify, content)
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '0'
      )
      expect(taskToModify.description.length).to.equal(5)
    })
    it('removes a description from a TODO that starts on the same line as code', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '1'
      )
      expect(taskToModify.description.length).to.equal(4)
      await repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text)
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '1'
      )
      expect(taskToModify.description.length).to.equal(3)
    })
    it('removes a a description from a TODO in a block comment', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '2'
      )
      expect(taskToModify.description.length).to.equal(6)
      await repo3.modifyTaskFromContent(
        taskToModify,
        taskToModify.text)
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '2'
      )
      expect(taskToModify.description.length).to.equal(3)
    })
    it('modifies a a description for a TODO in a block comment', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '2'
      )
      expect(taskToModify.description.length).to.equal(6)
      const content = `${taskToModify.text}
- description line 1
- description line 2`
      await repo3.modifyTaskFromContent(taskToModify, content)
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '2'
      )
      expect(taskToModify.description.length).to.equal(5)
    })
    it.skip('removes a a description from a TODO on the same line as code with a description that ends with a block comment', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '3'
        )
        expect(taskToModify.description.length).to.equal(1)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '3'
            )
            expect(taskToModify.description.length).to.equal(0)
            done()
          }
        )
      })
    })

    it('removes a a description from a TODO with two lines of comments following', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '4'
      )
      expect(taskToModify.description.length).to.equal(5)
      await repo3.modifyTaskFromContent(
      taskToModify,
      taskToModify.text)
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '4'
      )
      expect(taskToModify.description.length).to.equal(3)
    })
    it('ends the description on blank comment lines', async () => {
      await proj3.init()
      var trickyTasks = repo3.getFile('tricky.js').getTasks()
      const task_a1 = trickyTasks.find(
        (task) => task.meta.id && task.meta.id[0] === 'a1'
      )
      const task_a3 = trickyTasks.find(
        (task) => task.meta.id && task.meta.id[0] === 'a3'
      )
      expect(task_a1.description.length).to.equal(4)
      expect(task_a3.description.length).to.equal(5)
    })
    it('removes a description from a TODO with a description in a yaml file', async () => {
      await proj3.init()
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '999'
      )
      expect(taskToModify.description.length).to.equal(4)
      await repo3.modifyTaskFromContent(
        taskToModify,
        taskToModify.text)
      var todo = repo3.getTasksInList('TODO')
      var taskToModify = todo.find(
        (task) => task.meta.id && task.meta.id[0] === '999'
      )
      expect(taskToModify.description.length).to.equal(3)
    })
  })

  describe('addTaskToFile', function () {
    beforeEach(function () {
      proj3 = createFileSystemProject({
        path: repo3Dir,
        config: Config.newDefaultConfig(),
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo3 = proj3.repo
    })
    it('should add a task to a file and return with file and task', async () => {
      const content = 'A task added to a file'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      proj3.config.keepEmptyPriority = true
      proj3.config.settings.cards.orderMeta = false
      proj3.config.settings.newCardSyntax = 'HASHTAG'
      await proj3.init()
      const list = "DOING"
      const { file, task } = await repo3.addTaskToFile(filePath, list, content)
      expect(file).toBeTruthy()
      expect(task).toBeTruthy()
    })

    it("Adds a task to a file that doesn't exist with order = null", async () => {
      const content = 'A task added to a file with order = null'
      const testFilePath = 'addTaskTestNew.md'
      const filePath = path.join(repo3.path, testFilePath)
      proj3.config.keepEmptyPriority = true
      proj3.config.settings.jounalType = "New File"
      proj3.config.settings.cards.orderMeta = false
      proj3.config.settings.newCardSyntax = 'MARKDOWN'
      await proj3.init()
      const list = "DOING"
      let { file } = await repo3.addTaskToFile(filePath, list, content)
      file = await repo3.readFileContent(file)
      expect(file.getContent().trim()).to.equal(`## [${content}](#${list}:)`)
      expect(file.getTasks().find(task => task.text === content)).toBeTruthy()
    })

    it('Adds a HASHTAG task to a file with orderMeta', async () => {
      proj3.config.settings.cards = { orderMeta : true, taskPrefix: '- [ ]'}
      proj3.config.settings.newCardSyntax = Task.Types.HASHTAG
      await proj3.init()
      const content = 'A task\n<!-- order:40 newTask:true -->\n'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      const expectedLines = JSON.stringify([
        '- [ ] #DOING A task',
        '  <!-- order:40 newTask:true -->',
        '',
        '',
        ''
      ])
      let { file, task } = await repo3.addTaskToFile(filePath, 'DOING', content)
      expect(task.meta.newTask).to.contain('true')
      expect(task.list).to.equal('DOING')
      file = await repo3.readFileContent(file)
      const lines = eol.split(file.content)
      expect(JSON.stringify(lines.slice(5))).to.equal(expectedLines)
    })

    it('Adds a MARKDOWN task to a file with orderMeta and keepEmptyPriority true', async () => {
      proj3.config.keepEmptyPriority = true
      proj3.config.settings.cards = { orderMeta : true, taskPrefix: '- [ ]'}
      proj3.config.settings.newCardSyntax = Task.Types.MARKDOWN

      await proj3.init()
      const content = 'A task!\n<!-- newTask:true -->\n'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      const expectedLines = JSON.stringify([
        '- [ ] [A task!](#DOING:)',
        '  <!-- newTask:true -->',
        '',
        '',
        ''
      ])
      let  { file, task } = await repo3.addTaskToFile(filePath, 'DOING', content)
      expect(task.meta.newTask).to.contain('true')
      expect(task.list).to.equal('DOING')
      file = await repo3.readFileContent(file)
      const lines = eol.split(file.content)
      expect(JSON.stringify(lines.slice(5))).to.deep.equal(expectedLines)
    })

    it('Adds a MARKDOWN task to a file with orderMeta: false and no order', async () => {
      proj3.config.keepEmptyPriority = true
      proj3.config.settings = {
        newCardSyntax: 'MARKDOWN',
        cards: {
          orderMeta: true,
          doneList: 'DONE',
          defaultList: 'TODO',
          addCheckBoxTasks: true,
          taskPrefix: '',
          // metaNewLine: true,
          // trackChanges: true,
        },
      }
      await proj3.init()
      const content = 'A task\n- with a bullet\n'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      const expectedLines = JSON.stringify([
        '[A task](#DOING:)',
        '- with a bullet',
        '',
        '',
        ''
      ])
      let {file, task } = await repo3.addTaskToFile(filePath, 'DOING', content)
      expect(task.list).to.equal('DOING')
      expect(task.text).to.equal('A task')
      file = await repo3.readFileContent(file)
      const lines = eol.split(file.content)
      expect(JSON.stringify(lines.slice(5))).to.deep.equal(expectedLines)
    })

    it('Adds a HASHTAG task to a file with orderMeta: true and no order', async () => {
      proj3.config.keepEmptyPriority = true
      proj3.config.settings.cards = { orderMeta : true, taskPrefix: '- [ ]'}
      proj3.config.settings.newCardSyntax = Task.Types.HASHTAG

      await proj3.init()
      const content = 'A task\n- with a bullet\n'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      const expectedLines = JSON.stringify([
        '- [ ] #DOING A task',
        '  - with a bullet',
        '',
        '',
        ''
      ])
      let {file, task } = await repo3.addTaskToFile(filePath, 'DOING', content)
      expect(task.list).to.equal('DOING')
      expect(task.text).to.equal('A task')
      file = await repo3.readFileContent(file)
      const lines = eol.split(file.content)
      expect(JSON.stringify(lines.slice(5))).to.deep.equal(expectedLines)
    })
  })

  describe('query', function () {
    beforeEach(function () {
      proj1 = createFileSystemProject({
        path: repo1Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo1 = proj1.repo
    })
    it('Should find tasks with tags=/one\\/two/', async () => {
      await proj1.init()
      const filter = 'tags=/one\\/two/'
      const lists = repo1.query(filter)
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        1
      )
    })
    it('Should find tasks with tags=one', async () => {
      await proj1.init()
      const lists = repo1.query('tags=one')
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        1
      )
    })
    it('Should filter tasks by modified time with rql', async () => {
      await proj1.init()
      const lists = repo1.query('list=DOING')
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        3
      )
    })
    it('Should filter tasks by modified time monquery', async () => {
      await proj1.init()
      const lists = repo1.query('list = /DO/')
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        3
      )
      expect(lists.find((list) => list.name === 'TODO').tasks.length).to.equal(3)
    })
    it('Should filter tasks with a regex', async () => {
      await proj1.init()
      const lists = repo1.query('task')
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        3
      )
    })
    it('Should return a result with a bad query', async () => {
      await proj1.init()
      const lists = repo1.query('^&%^')
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        0
      )
    })
    it('should query using dates', async () => {
      await proj1.init()
      let lists = repo1.query(
        'due < "2020-11-14" and list != DONE +due +order'
      )
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        3
      )
      lists = repo1.query(
        'dueDate < "2020-11-13T12:32:55.216Z" and list != DONE +dueDate +order'
      )
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        2
      )
      lists = repo1.query(
        'meta.due < "2020-11-13T12:32:55.216Z" and list != DONE +meta.due +order'
      )
      expect(lists.find((list) => list.name === 'DOING').tasks.length).to.equal(
        2
      )
    })
    it('should sort using +[attribute] for ascending in with', async () => {
      await proj1.init()
      let lists = repo1.query(
        'due < "2020-11-13T12:32:55.216Z" AND list != DONE +dueDate +order'
      )
      let doing = lists.find((list) => list.name === 'DOING')
      expect(doing.tasks.length).to.equal(2)
      expect(doing.tasks[0].order).toBe(100)
      expect(doing.tasks[1].order).toBe(60)
    })
    it('should sort using +[attribute] for ascending with regex', async () => {
      await proj1.init()
      let lists = repo1.query('due +due +order')
      let doing = lists.find((list) => list.name === 'DOING')
      expect(doing.tasks.length).to.equal(3)
      expect(doing.tasks[0].order).toBe(100)
      expect(doing.tasks[1].order).toBe(60)
    })
  })

  describe('replaceDatesInQuery', function () {
    it('Should replace dates in a query', () => {
      let query = {
        one: {
          a: 1,
          b: 2,
        },
        two: {
          c: [
            {
              four: '2021-12-05',
            },
            {
              five: '2021',
            },
          ],
          d: {
            three: '2021-01-01',
          },
          e: null,
          f: undefined,
          g: 'string',
          h: true,
        },
      }
      query = Repository.replaceDatesInQuery(query)
      expect(query.one.a).to.equal(1)
      expect(query.one.b).to.equal(2)
      expect(query.two.c[0].four).to.equal(Date.parse('2021-12-05'))
      expect(query.two.c[1].five).to.equal('2021')
      expect(query.two.d.three).to.equal(Date.parse('2021-01-01'))
      expect(query.two.e).to.equal(null)
      expect(query.two.f).to.equal(undefined)
      expect(query.two.g).to.equal('string')
      expect(query.two.h).to.be.true
    })
  })

  describe('filterObjectValues', function () {
    it('filters values', function () {
      let object = {
        one: {
          a: 1,
          b: 2,
        },
        two: {
          c: [
            {
              four: 4,
            },
            {
              five: 5,
            },
          ],
          d: {
            three: 5,
          },
          e: null,
          f: undefined,
          g: 'string',
          h: true,
        },
      }
      object = Repository.filterObjectValues(object, (key, value) => {
        if (Number.isInteger(value)) return 0
        return value
      })
      expect(object.one.a).to.equal(0)
      expect(object.one.b).to.equal(0)
      expect(object.two.c[0].four).to.equal(0)
      expect(object.two.c[1].five).to.equal(0)
      expect(object.two.d.three).to.equal(0)
      expect(object.two.e).to.equal(null)
      expect(object.two.f).to.equal(undefined)
      expect(object.two.g).to.equal('string')
      expect(object.two.h).to.be.true
    })
  })

  describe('moveTask', () => {
    it('Should move a task in a file with orderMeta', async () => {
      const config = Config.newDefaultConfig()
      config.keepEmptyPriority = true
      moveMetaOrderProj = createFileSystemProject({
        path: moveMetaOrderDir,
        config,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      moveMetaOrderRepo = moveMetaOrderProj.repo
  
      const listName = 'DOING'
      await moveMetaOrderProj.init()
      var list = moveMetaOrderRepo.getTasksInList(listName)
      var task = list[0]
      await moveMetaOrderRepo.moveTask({task, newList: 'TODO', newPos: 2})
      var list = moveMetaOrderRepo.getTasksInList('TODO')
      const originalTask = task
      const movedTask =  list[2]
      expect(movedTask.source.path).to.equal(originalTask.source.path)
      expect(movedTask.line).to.equal(originalTask.line)
      expect(movedTask.text).to.equal(originalTask.text)
    })

    it('Should move a task in a file with orderMeta and keepEmptyPriority = true', async () => {
      const listName = 'DOING'
      const project = createFileSystemProject({
        path: moveMetaOrderKeepEmptyPriorityDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      const repo = project.repo
      await project.init()
      var list = repo.getTasksInList(listName)
      var task = list[0]
      await repo.moveTask({task, newList:'TODO', newPos: 2})
      var list = repo.getTasksInList('TODO')
      const originalTask = task
      const movedTask =  list[2]
      expect(movedTask.source.path).to.equal(originalTask.source.path)
      expect(movedTask.line).to.equal(originalTask.line)
      expect(movedTask.text).to.equal(originalTask.text)
    })

    it('should move a task to the proper location even if other tasks around it have the same order', async () => {
      noOrderProj = createFileSystemProject({
        path: noOrderRepoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      noOrderRepo = noOrderProj.repo
      await noOrderProj.init()

      const list = 'TODO', pos = 5
      const newList = 'DOING', newPos = 4
      let tasks = noOrderRepo.getTasksInList(list)
      const originalTask = tasks[pos]

      await noOrderRepo.moveTask({task: originalTask, newList, newPos})
      tasks = noOrderRepo.getTasksInList(newList)
      const movedTask =  tasks[newPos]
      expect(movedTask.source.path).to.equal(originalTask.source.path)
      expect(movedTask.line).to.equal(originalTask.line)
      expect(movedTask.text).to.equal(originalTask.text)
    })

  })

  describe('getTasksByList', () => {
    it('should return tasks in a filtered list', async () => {
      defaultCardsProj = createFileSystemProject({
        path: defaultCardsDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      defaultCardsRepo = defaultCardsProj.repo

      await defaultCardsProj.init()
      const lists = defaultCardsRepo.getTasksByList()
      // old.md in .stversions should be ignored
      expect(lists.find((list) => list.name === 'DONE')
        .tasks.length).to.equal(0)
      expect(lists[0].tasks[0].order).toBeCloseTo(10)
      expect(lists[0].tasks[1].order).toBeCloseTo(8)
      expect(lists[0].tasks[2].order).toBeCloseTo(7)
      expect(lists[0].tasks[3].order).toBeCloseTo(6)
      expect(lists[0].tasks[4].order).toBeCloseTo(5)
      expect(lists[0].tasks[5].order).toBeCloseTo(4.5)
      expect(lists[0].tasks[6].order).toBeCloseTo(4)
      expect(lists[0].tasks[7].order).toBeCloseTo(3)
      expect(lists[0].tasks[8].order).toBeCloseTo(2)
      expect(lists[0].tasks[9].order).toBeCloseTo(1.5)
      expect(lists[0].tasks[10].order).toBeCloseTo(1)
      expect(lists[0].tasks[11].order).toBeCloseTo(0)
    })
  })

  describe('It should allow : or :: in config.settings.metaSep', function () {
    it('should read metaData with a :: as sep', async () => {
      metaSepTestProj = createFileSystemProject({
        path: metaSepTestDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      metaSepTestRepo = metaSepTestProj.repo
      await metaSepTestProj.init()
      const doneList = metaSepTestRepo
        .getTasksByList()
        .find(({ name }) => name === 'DONE')
      const task = doneList.tasks[0]
      const meta = task.meta
      expect(meta.DONE[0]).to.exist
      expect(meta.completed[0]).to.exist
      expect(task.content.includes(`DONE::${meta.DONE[0]}`)).to.be.true
      expect(task.content.includes(`completed::${meta.completed[0]}`)).to.be.true
    })
  })

  describe('add and remove metadata', () => {
    it('Removes metadata from a task with a checkbox prefix', async() => {
      metaSepTestProj = createFileSystemProject({
        path: metaSepTestDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      metaSepTestRepo = metaSepTestProj.repo
      const getTask = () => metaSepTestRepo
        .getTasks()
        .filter((task) => task.meta.id && task.meta.id[0] === 'arm123')
        .pop()
      
        await metaSepTestProj.init()
      const filePath = path.join(metaSepTestRepo.path, 'metadata-test.md')
      const content = `A new task with space and expand meta

space

expand::1
id::arm123`
      
      await metaSepTestRepo.addTaskToFile(filePath, 'TODO', content)
      expect(getTask().metaKeys.includes('expand')).to.be.true
      await metaSepTestProj.removeMetadata(getTask(), 'expand', '1')
      expect(getTask().metaKeys.includes('expand')).to.be.false
    })
  })

  describe.skip('large project', function () {
    it('should load correctly', function (done) {
      this.timeout(10 * 1000)
      const start = new Date()
      const repo = fsStore(new Repository('../imdone copy'))
      appContext().projectContext = new ProjectContext(repo)
      proj.init(function (err, result) {
        const end = new Date()
        const duration = end.getTime() - start.getTime()
        if (err) done(err)
        const tasks = repo.getTasks()
        const files = repo.getFiles()
        console.log(`tasks: ${tasks.length}`)
        console.log(`files: ${files.length}`)
        console.log(`duration: ${duration}`)
        done()
      })
    })
  })
})

describe("getNextIndexWithDifferentOrder", () => {
  it.each([
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 0, 4],
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 1, 4],
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 2, 4],
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 3, 4],
    [[null, null, null, null], 0, -1],
    [[null, null, null, null], 1, -1],
    [[null, null, null, null], 2, -1],
    [[null, null, null, null], 3, -1],
    [[], 0, -1],
    [[0, 1, 2, 3, 4, 5, 6, 7], 8, -1 ]
  ])("Given tasks with order: %j and index: %j should get the index: %j with a different order", (orders, pos, expected) => {
    const tasks = orders.map(order => ({order}))
    const result = Repository.getNextIndexWithDifferentOrder(tasks, pos)
    expect(result).to.equal(expected)
  })
})

describe("getPreviousIndexWithDifferentOrder", () => {
  it.each([
    [[1, 2, 3, 3, 3, 4, null, null], 2, 1],
    [[1, 2, 3, 3, 3, 4, null, null], 3, 1],
    [[1, 2, 3, 3, 3, 4, null, null], 4, 1],
    [[1, 2, 3, 3, 3, 4, null, null], 6, 5],
    [[1, 2, 3, 3, 3, 4, null, null], 7, 5],
    [[0, 0, 0, 0, 1, 2, 3], 0, -1],
    [[0, 0, 0, 0, 1, 2, 3], 1, -1],
    [[0, 0, 0, 0, 1, 2, 3], 2, -1],
    [[0, 0, 0, 0, 1, 2, 3], 3, -1],
    [[], 0, -1],
    [[-10, -9, -8, -7, -6, -5, -4, null, null, null], 10, 6],
    [[-10, -9, -8, -7, -6, -5, -4, null, null, null], 9, 6],
  ])("Given tasks with order: %j, newPos: %j should return %j", (order, pos, expected) => {
    const tasks = order.map(order => ({order}))
    const result = Repository.getPreviousIndexWithDifferentOrder(tasks, pos)
    expect(result).to.equal(expected)
  })
})

describe('getTasksToModify', () => {
  it.each([
    [[4], [-10, -9, -8, -7, -6, null], 5],
    [[-20], [-10, -9, -8, -7, -6], 0],
    [[15], [-10, 0, 10, 20, 30, 40, 50], 3],
    [[5, 10, 15, 20, 25], [-10, 0, 10, 10, 10, 10, 30, 40, 50], 4],
    [[5, 10, 15, 20, 25], [-10, 0, 10, 10, 10, 10, 30, 40, 50], 5],
    [[-10], [null, null, null, 30, 40], 0]
  ])('Gets %j tasks to modify from task list %j when moving task to new position %j', (expected, taskList, newPos) => {
    const task = {}
    const tasksToModify = Repository.getTasksToModify(task, taskList.map((order, index) => ({order})), newPos);
    const tasksToModifyString = JSON.stringify(tasksToModify)
    const expectedString = JSON.stringify(expected.map(order => ({order})))
    expect(tasksToModifyString).to.equal(expectedString)
  })

})

describe('parseHideListsFromQueryString', () => {
  it('should return an empty array if no hide parameter is present', () => {
    let query = 'tags=important';
    const { hideLists, queryString } = parseHideListsFromQueryString(query);
    expect(hideLists).to.be.empty;
    expect(queryString).to.equal(query);
  });

  it ('should handle a single list to hide if hide parameter is present', () => {
    const query = 'tags=important hide: DOING';
    const { hideLists, queryString } = parseHideListsFromQueryString(query);
    expect(hideLists).toEqual(['DOING']);
    expect(queryString).to.equal('tags=important');

  })

  it('should return an array of lists to hide if hide parameter is present', () => {
    const query = 'tags=important hide: DOING, DONE';
    const { hideLists, queryString } = parseHideListsFromQueryString(query);
    expect(hideLists).toEqual(['DOING', 'DONE']);
    expect(queryString).to.equal('tags=important');
  });

  it('should handle empty hide parameter', () => {
    const query = 'tags=important hide: ';
    const { hideLists, queryString } = parseHideListsFromQueryString(query);
    expect(hideLists).toEqual([]);
    expect(queryString).to.equal('tags=important');
  });
});
