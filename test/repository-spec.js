const forEach = require('mocha-each')
const Project = require('../lib/project')
const List = require('../lib/list')

var should = require('should'),
  expect = require('expect.js'),
  Repository = require('../lib/repository'),
  Config = require('../lib/config'),
  File = require('../lib/file'),
  path = require('path'),
  fs = require('fs'),
  { existsSync } = fs,
  wrench = require('wrench'),
  fsStore = require('../lib/mixins/repo-fs-store'),
  log = require('debug')('imdone-core:repository-spec'),
  languages = require('../lib/languages'),
  eol = require('eol'),
  async = require('async')
const appContext = require('../lib/context/ApplicationContext')
const ProjectContext = require('../lib/ProjectContext')
const Task = require('../lib/task')
const { createFileSystemProject } = require('../lib/project-factory')
const { parseHideListsFromQueryString } = Repository

describe('Repository', function () {
  var tmpDir = path.join(process.cwd(), 'tmp'),
    tmpReposDir = path.join(tmpDir, 'repos'),
    repoSrc = path.join(process.cwd(), 'test', 'repos'),
    filesSrc = path.join(process.cwd(), 'test', 'files'),
    repoDir = path.join(tmpReposDir, 'files'),
    repo1Dir = path.join(tmpReposDir, 'repo1'),
    repo2Dir = path.join(tmpReposDir, 'repo2'),
    repo3Dir = path.join(tmpReposDir, 'repo3'),
    defaultCardsDir = path.join(tmpReposDir, 'default-cards'),
    defaultCards2Dir = path.join(tmpReposDir, 'default-cards-2'),
    noOrderRepoDir = path.join(tmpReposDir, 'no-order-repo'),
    moveMetaOrderDir = path.join(tmpReposDir, 'move-meta-order'),
    moveMetaOrderKeepEmptyPriorityDir = path.join(tmpReposDir, 'move-meta-order-keep-empty-priority'),
    metaSepTestDir = path.join(tmpReposDir, 'meta-sep-test'),
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

  beforeEach(function (done) {
    try {
      if (existsSync(tmpDir)) {
        wrench.rmdirSyncRecursive(tmpDir)
      }
      wrench.mkdirSyncRecursive(tmpDir)
    } catch (e) {
      return done(e)
    }

    appContext().pluginRegistry = { getAvailablePlugins: async () => [] }

    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, { forceDelete: true })
    wrench.copyDirSyncRecursive(filesSrc, repoDir, { forceDelete: true })
    repo = fsStore(new Repository(repoDir))
    proj = new Project(repo)

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
    done()
  })

  afterEach(function (done) {
    proj1.destroy()
    proj2.destroy()
    proj3.destroy()
    proj.destroy()
    defaultCardsProj.destroy()
    noOrderProj.destroy()
    moveMetaOrderProj.destroy()
    metaSepTestProj.destroy()
    wrench.rmdirSyncRecursive(tmpDir, true)
    done()
  })

  it('Should init successfully', function (done) {
    proj = createFileSystemProject({
      path: repoDir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })  
    proj.init(function (err, files) {
      if (err) return done(err)
      expect(files.length).to.be(14)
      done()
    })
  })

  it('Should write and delete a file successfully', function (done) {
    proj1 = createFileSystemProject({
      path: repo1Dir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo1 = proj1.repo
    proj1.init(function (err, files) {
      files.length.should.be.exactly(3)
      var file = new File({
        repoId: repo1.getId(),
        filePath: 'test.md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo1.project,
      })
      repo1.writeAndExtract(file, false, function (err, file) {
        expect(err).to.be(null)
        file.tasks.length.should.be.exactly(1)
        repo1.deleteFile(file.path, function (err, file) {
          expect(err).to.be(null)
          repo1.files.length.should.be.exactly(3)
          done()
        })
      })
    })
  })

  it('Should write and delete a file in a sub-dir successfully', function (done) {
    proj1 = createFileSystemProject({
      path: repo1Dir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo1 = proj1.repo
    proj1.init(function (err, files) {
      files.length.should.be.exactly(3)
      var file = new File({
        repoId: repo1.getId(),
        filePath: 'some-dir/some-dir2/test.md',
        content: '[Add some content](#DONE:0)',
        languages: languages,
        project: repo1.project,
      })
      repo1.writeAndExtract(file, false, function (err, file) {
        expect(err).to.be(null)
        file.tasks.length.should.be.exactly(1)
        repo1.deleteFile(file.path, function (err, file) {
          expect(err).to.be(null)
          repo1.files.length.should.be.exactly(3)
          done()
        })
      })
    })
  })

  it('Should find checkBox tasks', function (done) {
    proj = createFileSystemProject({
      path: repoDir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    })
    repo = proj.repo
    var config = Config.newDefaultConfig()
    // BACKLOG Test with changes to config
    // <!--
    // order:-1045
    // -->
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
    config.keepEmptyPriority = false
    repo.loadConfig = (cb) => {
      repo.updateConfig(config, cb)
    }
    proj.init(function (err, files) {
      if (err) return done(err)
      log('files:', files)
      const file = files.find((file) => file.path === 'checkbox-tasks.md')
      expect(file.tasks[1].text).to.equal('A checkbox task without a list')
      expect(err).to.be(null)
      expect(repo.files.length).to.be(14)
      done()
    })
  })

  describe('Repository.query', function () {
    it('Should should sort according to sort values', function (done) {
      proj2 = createFileSystemProject({
        path: repo2Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo2 = proj2.repo
      proj2.init(function (err, files) {
        expect(err).to.be(null)
        const tasks = Repository.query(repo2.getTasks(), 'list != OKAY +list')
        expect(tasks[0].list).to.be('DOING')
        expect(tasks[1].list).to.be('DOING')
        expect(tasks[2].list).to.be('DOING')
        expect(tasks[3].list).to.be('DONE')
        expect(tasks[4].list).to.be('TODO')
        expect(tasks[5].list).to.be('TODO')
        expect(tasks[6].list).to.be('TODO')
        done()
      })
    })
  })

  describe('hasDefaultFile', function (done) {
    beforeEach(function () {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
    })
    it('Should return false if no default file exists', function (done) {
      proj.init(function (err, files) {
        expect(repo.hasDefaultFile()).to.be(false)
        done()
      })
    })

    it('Should return true if readme.md file exists', function (done) {
      proj.init(function (err, files) {
        var file = new File({
          repoId: repo.getId(),
          filePath: 'reADmE.md',
          content: '[Add some content](#DONE:0)',
          languages: languages,
          project: repo.project,
        })
        repo.writeAndExtract(file, false, function (err, file) {
          expect(repo.hasDefaultFile()).to.be(true)

          repo.deleteFile(file.path, function (err, file) {
            done()
          })
        })
      })
    })

    it('Should return true if home.md file exists', function (done) {
      proj.init(function (err, files) {
        var file = new File({
          repoId: repo.getId(),
          filePath: 'hOmE.Md',
          content: '[Add some content](#DONE:0)',
          languages: languages,
          project: repo.project,
        })
        repo.writeAndExtract(file, false, function (err, file) {
          expect(repo.hasDefaultFile()).to.be(true)

          repo.deleteFile(file.path, function (err, file) {
            done()
          })
        })
      })
    })
  })

  describe('getDefaultFile', function (done) {
    beforeEach(function () {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
    })
    it("should return undefined if a default file doesn't exist", function (done) {
      proj.init(function (err, files) {
        expect(repo.getDefaultFile()).to.be(undefined)
        done()
      })
    })

    it('should return readme.md if it exist', function (done) {
      proj.init(function (err, files) {
        var file = new File({
          repoId: repo.getId(),
          filePath: 'reADmE.md',
          content: '[Add some content](#DONE:0)',
          languages: languages,
          project: repo.project,
        })
        repo.writeAndExtract(file, false, function (err, file) {
          expect(repo.getDefaultFile()).to.be(file)

          repo.deleteFile(file.path, function (err, file) {
            done()
          })
        })
      })
    })

    it('Should return home.md if it exists', function (done) {
      proj.init(function (err, files) {
        var file = new File({
          repoId: repo.getId(),
          filePath: 'hOmE.Md',
          content: '[Add some content](#DONE:0)',
          languages: languages,
          project: repo.project,
        })
        repo.writeAndExtract(file, false, function (err, file) {
          expect(repo.getDefaultFile()).to.be(file)

          repo.deleteFile(file.path, function (err, file) {
            done()
          })
        })
      })
    })

    it('Should return readme.md if both home.md and readme.md exist', function (done) {
      proj.init(function (err, files) {
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
        async.parallel(
          [
            function (cb) {
              repo.writeAndExtract(home, false, function (err, file) {
                cb(null, file)
              })
            },
            function (cb) {
              repo.writeAndExtract(readme, false, function (err, file) {
                cb(null, file)
              })
            },
          ],
          function (err, results) {
            expect(repo.getDefaultFile()).to.be(readme)

            async.parallel(
              [
                function (cb) {
                  repo.deleteFile(home.path, function (err, file) {
                    cb(null, file)
                  })
                },
                function (cb) {
                  repo.deleteFile(readme.path, function (err, file) {
                    cb(null, file)
                  })
                },
              ],
              function (err, results) {
                expect(err).to.be(null)
                done()
              }
            )
          }
        )
      })
    })
  })

  describe('saveConfig', function () {
    it('Should save the config file', function (done) {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
      repo.saveConfig(function (err) {
        expect(err).to.be(null)
        expect(fs.existsSync(configDir)).to.be(true)
        wrench.rmdirSyncRecursive(configDir, true)
        expect(fs.existsSync(configDir)).to.be(false)
        done()
      })
    })
  })

  describe('toggleList', function () {
    it('Should toggle the list', async function () {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
      await proj.init()
      await repo.toggleList('TODO')
      expect(repo.getList('TODO').hidden).to.be(true)
      await repo.toggleList('TODO')
      expect(repo.getList('TODO').hidden).to.be(false)
    })
  })

  describe('toggleListIgnore', function () {
    it('Should toggle the list ignore', async function () {
      proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo = proj.repo
      await proj.init()
      await repo.toggleListIgnore('TODO')
      expect(repo.getList('TODO').ignore).to.be(true)
      await repo.toggleListIgnore('TODO')
      expect(repo.getList('TODO').ignore).to.be(false)
    })
  })

  describe('loadConfig', function (done) {
    it('Should load the config file', function (done) {
      appContext().projectContext = new ProjectContext(repo)
      repo.config = Config.newDefaultConfig()
      repo.config.foo = 'bar'
      repo.saveConfig(function (err) {
        expect(fs.existsSync(configDir)).to.be(true)
        repo.loadConfig(function (err) {
          expect(repo.config.foo).to.be('bar')
          wrench.rmdirSyncRecursive(configDir, true)
          expect(fs.existsSync(configDir)).to.be(false)
          done()
        })
      })
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
    it('should modify the list name', function (done) {
      proj1.init(function (err) {
        const todo = repo1.getList("TODO")
        const updatedList = {...todo, name: "PLANNING"}
        expect(err).to.be(null)        
        expect(repo1.getTasksInList('TODO').length).to.be(3)
        repo1.updateList(updatedList.id, updatedList)
        .then(() => {
          expect(repo1.getTasksInList('PLANNING').length).to.be(3)
          expect(repo1.getTasksInList('TODO').length).to.be(0)
          done()
        })
        .catch(done)
      })
    })

    it('should modify the list filter', async function () {
      await proj1.init()
      const bareList = {name: "Filtered", filter: "text = /task/", id: "filtered"}     
      const filtered = new List(bareList)
      await repo1.addList(filtered)
      const { lists } = await proj1.toImdoneJSON()
      expect(lists.find(list => list.id === filtered.id).tasks.length).to.be(6)
      await repo1.updateList(filtered.id, {...bareList, filter: "text = /tasks/"})
      const updatedLists = (await proj1.toImdoneJSON()).lists
      expect(updatedLists.find(list => list.id === filtered.id).tasks.length).to.be(0)
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
    it('deletes all tasks', (done) => {
      proj3.init(function (err, result) {
        var tasks = repo3.getTasks()
        repo3.deleteTasks(tasks, function (err) {
          var tasksNow = repo3.getTasks()
          expect(tasksNow.length).to.be(0)
          done()
        })
      })
    })

    it('deletes all tasks in a list', (done) => {
      proj3.init(function (err, result) {
        var todos = repo3.getTasksInList('TODO')
        repo3.deleteTasks(todos, function (err) {
          var todosNow = repo3.getTasksInList('TODO')
          expect(todosNow.length).to.be(0)
          done()
        })
      })
    })

    it('deletes all tasks that match a filter', (done) => {
      const project = createFileSystemProject({
        path: defaultCards2Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      const repo = appContext().repo
      project.init(function (err, result) {
        const cards = project.getCards('cards')
        repo.deleteTasks(cards, function (err) {
          var cardsNow = project.getCards('cards')
          expect(cardsNow.length).to.be(0)
          expect(project.getCards().length).to.be(8)
          done()
        })
      })
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
    it('deletes a task with blank lines', (done) => {
      proj3.init(function (err, result) {
        var doing = repo3.getTasksInList('DOING')
        var taskToDelete = doing.find(
          (task) => task.meta.id && task.meta.id[0] === '7'
        )
        repo3.deleteTask(taskToDelete, function (err) {
          var todo = repo3.getTasksInList('DOING')
          var taskToDelete = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '7'
          )
          expect(taskToDelete).to.be(undefined)
          done()
        })
      })
    })
    it('deletes a block comment task on a single line', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToDelete = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '0'
        )
        repo3.deleteTask(taskToDelete, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToDelete = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '0'
          )
          expect(taskToDelete).to.be(undefined)
          done()
        })
      })
    })
    it('deletes a TODO that starts on the same line as code', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToDelete = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '1'
        )
        repo3.deleteTask(taskToDelete, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToDelete = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '1'
          )
          expect(taskToDelete).to.be(undefined)
          done()
        })
      })
    })
    it('deletes a TODO in a block comment', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToDelete = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '2'
        )
        repo3.deleteTask(taskToDelete, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToDelete = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '2'
          )
          expect(taskToDelete).to.be(undefined)
          done()
        })
      })
    })
    it('deletes a TODO in a block comment on the same lines', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToDelete = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '3'
        )
        repo3.deleteTask(taskToDelete, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToDelete = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '3'
          )
          expect(taskToDelete).to.be(undefined)
          done()
        })
      })
    })
    it('deletes a TODO with single line comments', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToDelete = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '4'
        )
        repo3.deleteTask(taskToDelete, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToDelete = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '4'
          )
          expect(taskToDelete).to.be(undefined)
          done()
        })
      })
    })
    it('deletes all TODOs in a file', (done) => {
      proj3.init(function (err, result) {
        var todos = repo3.getTasksInList('TODO')

        async.until(
          function test(cb) {
            return todos.length === 0
          },
          function iter(next) {
            let task = todos.pop()
            const file = repo3.getFileForTask(task)
            if (!file) {
              return next()
            }
            repo3.deleteTask(task, function (err) {
              if (err) return next(err)
              repo3.readFile(file, function (err) {
                if (err) return next(err)
                var todo = repo3.getTasksInList('TODO')
                expect(todo.length).to.be(todos.length)
                todos = repo3.getTasksInList('TODO')
                next()
              })
            })
          },
          function (err) {
            done(err)
          }
        )
      })
    })
    it('deletes all TODOs in a file', (done) => {
      const list = 'DOING'
      proj3.init(function (err, result) {
        let todos = repo3.getTasksInList(list)

        async.until(
          function test(cb) {
            return todos.length === 0
          },
          function iter(next) {
            let task = todos.pop()
            const file = repo3.getFileForTask(task)
            if (!file) {
              return next()
            }
            repo3.deleteTask(task, function (err) {
              if (err) return next(err)
              repo3.readFile(file, function (err) {
                if (err) return next(err)
                var todo = repo3.getTasksInList(list)
                expect(todo.length).to.be(todos.length)
                todos = repo3.getTasksInList(list)
                next()
              })
            })
          },
          function (err) {
            done(err)
          }
        )
      })
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
    it('modifies a description on a single line block comment', (done) => {
      proj3.init(function (err, result) {
        if (err) return done(err)
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '0'
        )
        expect(taskToModify.description.length).to.be(3)
        const content = `${taskToModify.text}
- description line 1
- description line 2`
        repo3.modifyTaskFromContent(taskToModify, content, function (err) {
          if (err) return done(err)
          var todo = repo3.getTasksInList('TODO')
          var taskToModify = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '0'
          )
          expect(taskToModify.description.length).to.be(5)
          done()
        })
      })
    })
    it('removes a description from a TODO that starts on the same line as code', (done) => {
      proj3.init(function (err, result) {
        if (err) return done(err)
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '1'
        )
        expect(taskToModify.description.length).to.be(4)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            if (err) return done(err)
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '1'
            )
            expect(taskToModify.description.length).to.be(3)
            done()
          }
        )
      })
    })
    it('removes a a description from a TODO in a block comment', (done) => {
      proj3.init(function (err, result) {
        if (err) return done(err)
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '2'
        )
        expect(taskToModify.description.length).to.be(6)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            if (err) return done(err)
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '2'
            )
            expect(taskToModify.description.length).to.be(3)
            done()
          }
        )
      })
    })
    it('modifies a a description for a TODO in a block comment', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '2'
        )
        expect(taskToModify.description.length).to.be(6)
        const content = `${taskToModify.text}
- description line 1
- description line 2`
        repo3.modifyTaskFromContent(taskToModify, content, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToModify = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '2'
          )
          expect(taskToModify.description.length).to.be(5)
          done()
        })
      })
    })
    it.skip('removes a a description from a TODO on the same line as code with a description that ends with a block comment', (done) => {
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '3'
        )
        expect(taskToModify.description.length).to.be(1)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '3'
            )
            expect(taskToModify.description.length).to.be(0)
            done()
          }
        )
      })
    })
    it('removes a a description from a TODO with two lines of comments following', (done) => {
      proj3.init(function (err, result) {
        if (err) return done(err)
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '4'
        )
        expect(taskToModify.description.length).to.be(5)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            if (err) return done(err)
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '4'
            )
            expect(taskToModify.description.length).to.be(3)
            done()
          }
        )
      })
    })
    it('ends the description on blank comment lines', (done) => {
      proj3.init(function (err, result) {
        var trickyTasks = repo3.getFile('tricky.js').getTasks()
        const task_a1 = trickyTasks.find(
          (task) => task.meta.id && task.meta.id[0] === 'a1'
        )
        const task_a3 = trickyTasks.find(
          (task) => task.meta.id && task.meta.id[0] === 'a3'
        )
        expect(task_a1.description.length).to.be(4)
        expect(task_a3.description.length).to.be(5)
        done()
      })
    })
    it('removes a description from a TODO with a description in a yaml file', (done) => {
      proj3.init(function (err, result) {
        if (err) return done(err)
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '999'
        )
        expect(taskToModify.description.length).to.be(4)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            if (err) return done(err)
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '999'
            )
            expect(taskToModify.description.length).to.be(3)
            done()
          }
        )
      })
    })
  })

  describe('addTaskToFile', function (done) {
    beforeEach(function () {
      proj3 = createFileSystemProject({
        path: repo3Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      repo3 = proj3.repo
    })
    it('should add a task to a file and call callback with file and taskId', (done) => {
      const content = 'A task added to a file'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      proj3.init(function (err, result) {
        proj3.config.keepEmptyPriority = true
        proj3.config.settings.cards.orderMeta = false
        proj3.config.settings.newCardSyntax = 'HASHTAG'
        const list = "DOING"
        repo3.addTaskToFile(filePath, list, content, (err, file, task) => {
          expect(file).to.be.ok()
          expect(task).to.be.ok()
          done()
        })
      })
    })

    it("Adds a task to a file that doesn't exist with order = null", (done) => {
      const content = 'A task added to a file with order = null'
      const testFilePath = 'addTaskTestNew.md'
      const filePath = path.join(repo3.path, testFilePath)
      proj3.init(function (err, result) {
        proj3.config.keepEmptyPriority = true
        proj3.config.settings.jounalType = "New File"
        proj3.config.settings.cards.orderMeta = false
        proj3.config.settings.newCardSyntax = 'MARKDOWN'
        const list = "DOING"
        repo3.addTaskToFile(filePath, list, content, (err, file) => {
          repo3.readFileContent(file, (err, file) => {
            expect(file.getContent().trim()).to.equal(`- [ ] [${content}](#${list}:)`)
            expect(file.getTasks().find(task => task.text === content)).to.be.ok()
            expect(err).to.be(null)
            done()
          })
        })
      })
    })

    it('Adds a HASHTAG task to a file with orderMeta', (done) => {
      repo3.loadConfig = (cb) => {
        const config = appContext().config
        config.settings.cards = { orderMeta : true, taskPrefix: '- [ ]'}
        config.settings.newCardSyntax = Task.Types.HASHTAG
        repo3.updateConfig(config, cb)
      }
      proj3.init(function (err, result) {
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
        repo3.addTaskToFile(filePath, 'DOING', content, (err, file) => {
          // BACKLOG make sure the task is added correctly
          // <!--
          // order:-1055
          // -->
          repo3.readFileContent(file, (err, file) => {
            const lines = eol.split(file.content)
            JSON.stringify(lines.slice(5)).should.equal(expectedLines)
            expect(err).to.be(null)
            done()
          })
        })
      })
    })

    it('Adds a MARKDOWN task to a file with orderMeta and keepEmptyPriority true', (done) => {
      repo3.loadConfig = (cb) => {
        const config = appContext().config
        config.keepEmptyPriority = true
        config.settings.cards = { orderMeta : true, taskPrefix: '- [ ]'}
        config.settings.newCardSyntax = Task.Types.MARKDOWN
        repo3.updateConfig(config, cb)
      }
      proj3.init(function (err, result) {
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
        repo3.addTaskToFile(filePath, 'DOING', content, (err, file) => {
          // BACKLOG make sure the task is added correctly
          // <!--
          // order:-1065
          // -->
          repo3.readFileContent(file, (err, file) => {
            const lines = eol.split(file.content)
            JSON.stringify(lines.slice(5)).should.equal(expectedLines)
            expect(err).to.be(null)
            done()
          })
        })
      })
    })

    it('Adds a MARKDOWN task to a file with orderMeta: false and no order', (done) => {
      var config = Config.newDefaultConfig()
      // BACKLOG Test with changes to config
      // <!--
      // order:-1075
      // -->
      config.keepEmptyPriority = true
      config.settings = {
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
      repo3.loadConfig = (cb) => {
        repo3.updateConfig(config, cb)
      }
      proj3.init(function (err, result) {
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
        repo3.addTaskToFile(filePath, 'DOING', content, (err, file) => {
          // BACKLOG make sure the task is added correctly
          // <!--
          // order:-1085
          // -->
          repo3.readFileContent(file, (err, file) => {
            const lines = eol.split(file.content)
            JSON.stringify(lines.slice(5)).should.equal(expectedLines)
            expect(err).to.be(null)
            done()
          })
        })
      })
    })

    it('Adds a HASHTAG task to a file with orderMeta: true and no order', (done) => {
      repo3.loadConfig = (cb) => {
        const config = appContext().config
        config.keepEmptyPriority = true
        config.settings.cards = { orderMeta : true, taskPrefix: '- [ ]'}
        config.settings.newCardSyntax = Task.Types.HASHTAG
        repo3.updateConfig(config, cb)
      }
      proj3.init(function (err, result) {
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
        repo3.addTaskToFile(filePath, 'DOING', content, (err, file) => {
          // BACKLOG make sure the task is added correctly
          // <!--
          // order:-1095
          // -->
          repo3.readFileContent(file, (err, file) => {
            const lines = eol.split(file.content)
            JSON.stringify(lines.slice(5)).should.equal(expectedLines)
            expect(err).to.be(null)
            done()
          })
        })
      })
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
    it('Should find tasks with tags=/one\\/two/', function (done) {
      proj1.init(function (err, result) {
        const filter = 'tags=/one\\/two/'
        const lists = repo1.query(filter)
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          1
        )
        done()
      })
    })
    it('Should find tasks with tags=one', function (done) {
      proj1.init(function (err, result) {
        const lists = repo1.query('tags=one')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          1
        )
        done()
      })
    })
    it('Should filter tasks by modified time with rql', function (done) {
      proj1.init(function (err, result) {
        const lists = repo1.query('list=DOING')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          3
        )
        done()
      })
    })
    it('Should filter tasks by modified time monquery', function (done) {
      proj1.init(function (err, result) {
        const lists = repo1.query('list = /DO/')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          3
        )
        expect(lists.find((list) => list.name === 'TODO').tasks.length).to.be(3)
        done()
      })
    })
    it('Should filter tasks with a regex', function (done) {
      proj1.init(function (err, result) {
        const lists = repo1.query('task')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          3
        )
        done()
      })
    })
    it('Should return a result with a bad query', function (done) {
      proj1.init(function (err, result) {
        const lists = repo1.query('^&%^')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          0
        )
        done()
      })
    })
    it('should query using dates', function (done) {
      proj1.init(function (err, result) {
        let lists = repo1.query(
          'due < "2020-11-14" and list != DONE +due +order'
        )
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          3
        )
        lists = repo1.query(
          'dueDate < "2020-11-13T12:32:55.216Z" and list != DONE +dueDate +order'
        )
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          2
        )
        lists = repo1.query(
          'meta.due < "2020-11-13T12:32:55.216Z" and list != DONE +meta.due +order'
        )
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          2
        )
        done()
      })
    })
    it('should sort using +[attribute] for ascending in with', function (done) {
      proj1.init(function (err, result) {
        let lists = repo1.query(
          'due < "2020-11-13T12:32:55.216Z" AND list != DONE +dueDate +order'
        )
        let doing = lists.find((list) => list.name === 'DOING')
        expect(doing.tasks.length).to.be(2)
        expect(doing.tasks[0].order).to.be(100)
        expect(doing.tasks[1].order).to.be(60)
        done()
      })
    })
    it('should sort using +[attribute] for ascending with regex', function (done) {
      proj1.init(function (err, result) {
        let lists = repo1.query('due +due +order')
        let doing = lists.find((list) => list.name === 'DOING')
        expect(doing.tasks.length).to.be(3)
        expect(doing.tasks[0].order).to.be(100)
        expect(doing.tasks[1].order).to.be(60)
        done()
      })
    })
  })

  describe('replaceDatesInQuery', function () {
    it('Should replace dates in a query', function () {
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
      expect(query.one.a).to.be(1)
      expect(query.one.b).to.be(2)
      expect(query.two.c[0].four).to.be(Date.parse('2021-12-05'))
      expect(query.two.c[1].five).to.be('2021')
      expect(query.two.d.three).to.be(Date.parse('2021-01-01'))
      expect(query.two.e).to.be(null)
      expect(query.two.f).to.be(undefined)
      expect(query.two.g).to.be('string')
      expect(query.two.h).to.be(true)
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
      expect(object.one.a).to.be(0)
      expect(object.one.b).to.be(0)
      expect(object.two.c[0].four).to.be(0)
      expect(object.two.c[1].five).to.be(0)
      expect(object.two.d.three).to.be(0)
      expect(object.two.e).to.be(null)
      expect(object.two.f).to.be(undefined)
      expect(object.two.g).to.be('string')
      expect(object.two.h).to.be(true)
    })
  })

  describe('moveTask', () => {
    it.skip('should move two tasks in the same file and extract the latest tasks', (done) => {
      const debugPath = path.join(process.cwd(), 'debug.md')
      repo.config = Config.newDefaultConfig()
      const projectContext = new ProjectContext(repo)
      projectContext.config.settings.doneList = 'DONE'
      projectContext.config.settings.cards = {
        metaNewLine: true,
        trackChanges: true,
      }
      appContext().projectContext = projectContext
      proj.init((err) => {
        if (err) done(err)
        const moveTasksFilePath = 'move-tasks.md'
        repo.getFiles().forEach((file) => {
          if (file.path !== moveTasksFilePath) {
            repo.removeFile(file)
          }
        })
        const content = fs
          .readFileSync(path.join(repoDir, moveTasksFilePath), 'utf-8')
          .split(eol.auto)
        fs.writeFileSync(
          debugPath,
          content.map((line, no) => `${no + 1} ${line}`).join(eol.lf)
        )

        const file = repo.getFile(moveTasksFilePath)
        const tasks = file.getTasks()
        const story2 = tasks.find((task) => task.text === 'Story 2')
        const story3 = tasks.find((task) => task.text === 'Story 3')
        story2.line.should.equal(21)
        story3.line.should.equal(28)
        const newPos = repo.getTasksInList('DOING').length
        repo.moveTask({ task: story2, newList: 'DOING', newPos }, (err) => {
          if (err) done(err)
          const file = repo.getFile(moveTasksFilePath)
          const story3 = file.getTasks().find((task) => task.text === 'Story 3')
          story3.line.should.equal(29)
          done()
        })
      })
    })

    it('Should move a task in a file with orderMeta', (done) => {
      moveMetaOrderProj = createFileSystemProject({
        path: moveMetaOrderDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      moveMetaOrderRepo = moveMetaOrderProj.repo
  
      const listName = 'DOING'
      moveMetaOrderProj.init((err, result) => {
        var list = moveMetaOrderRepo.getTasksInList(listName)
        var task = list[0]
        moveMetaOrderRepo.moveTasks([task], 'TODO', 2, (err) => {
          expect(err).to.be(undefined)
          var list = moveMetaOrderRepo.getTasksInList('TODO')
          task.equals(list[2]).should.be.true
          done()
        })
      })
    })

    it('Should move a task in a file with orderMeta and keepEmptyPriority = true', (done) => {
      const listName = 'DOING'
      const project = createFileSystemProject({
        path: moveMetaOrderKeepEmptyPriorityDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      const repo = project.repo
      project.init((err, result) => {
        var list = repo.getTasksInList(listName)
        var task = list[0]
        repo.moveTasks([task], 'TODO', 2, (err) => {
          expect(err).to.be(undefined)
          var list = repo.getTasksInList('TODO')
          task.equals(list[2]).should.be.true
          done()
        })
      })
    })

    it('should move a task to the proper location even if other tasks around it have the same order', (done) => {
      const listName = 'DOING'
      noOrderProj = createFileSystemProject({
        path: noOrderRepoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      noOrderRepo = noOrderProj.repo
      noOrderProj.init((err, result) => {
        var list = noOrderRepo.getTasksInList(listName)
        var task = list[5]
        noOrderRepo.moveTasks([task], listName, 4, (err) => {
          expect(err).to.be(undefined)
          var list = noOrderRepo.getTasksInList(listName)
          task.equals(list[4]).should.be.true
          done()
        })
      })
    })

  })

  describe('getTasksByList', () => {
    it('should return tasks in a filtered list', function (done) {
      defaultCardsProj = createFileSystemProject({
        path: defaultCardsDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      defaultCardsRepo = defaultCardsProj.repo

      defaultCardsProj.init(function (err, result) {
        if (err) return done(err)
        const lists = defaultCardsRepo.getTasksByList()
        // old.md in .stversions should be ignored
        lists
          .find((list) => list.name === 'DONE')
          .tasks.length.should.be.exactly(0)
        lists[0].tasks[0].order.should.be.exactly(10)
        lists[0].tasks[1].order.should.be.exactly(8)
        lists[0].tasks[2].order.should.be.exactly(7)
        lists[0].tasks[3].order.should.be.exactly(6)
        lists[0].tasks[4].order.should.be.exactly(5)
        lists[0].tasks[5].order.should.be.exactly(4.5)
        lists[0].tasks[6].order.should.be.exactly(4)
        lists[0].tasks[7].order.should.be.exactly(3)
        lists[0].tasks[8].order.should.be.exactly(2)
        lists[0].tasks[9].order.should.be.exactly(1.5)
        lists[0].tasks[10].order.should.be.exactly(1)
        should(lists[0].tasks[11].order).equal(0)
        done()
      })
    })
  })

  describe('It should allow : or :: in config.settings.metaSep', function () {
    it('should read metaData with a :: as sep', function (done) {
      metaSepTestProj = createFileSystemProject({
        path: metaSepTestDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      metaSepTestRepo = metaSepTestProj.repo
      metaSepTestProj.init((err, result) => {
        const doneList = metaSepTestRepo
          .getTasksByList()
          .find(({ name }) => name === 'DONE')
        const task = doneList.tasks[0]
        const meta = task.meta
        should.exist(meta.DONE[0])
        should.exist(meta.completed[0])
        task.content.includes(`DONE::${meta.DONE[0]}`).should.be.true()
        task.content
          .includes(`completed::${meta.completed[0]}`)
          .should.be.true()
        done()
      })
    })
  })

  describe('add and remove metadata', () => {
    it('Removes metadata from a task with a checkbox prefix', (done) => {
      metaSepTestProj = createFileSystemProject({
        path: metaSepTestDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
      metaSepTestRepo = metaSepTestProj.repo
      function getTask() {
        return metaSepTestRepo
          .getTasks()
          .filter((task) => task.meta.id && task.meta.id[0] === 'arm123')
          .pop()
      }
      metaSepTestProj.init((err, result) => {
        const filePath = path.join(metaSepTestRepo.path, 'metadata-test.md')
        const content = `A new task with space and expand meta

space

expand::1
id::arm123`
          .split(eol.lf)
          .join(eol.auto)
        metaSepTestRepo.addTaskToFile(
          filePath,
          'TODO',
          content,
          (err) => {
            if (err) return done(err);
            getTask().metaKeys.includes('expand').should.be.true()
            metaSepTestProj.removeMetadata(getTask(), 'expand', '1')
            .then(() => {
              getTask().metaKeys.includes('expand').should.be.false()
              done()
            })
            .catch(done)
          }
        )
      })
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
  forEach([
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
  ]).it("Given tasks with order: %j and index: %j should get the index: %j with a different order", (orders, pos, expected) => {
    const tasks = orders.map(order => ({order}))
    const result = Repository.getNextIndexWithDifferentOrder(tasks, pos)
    expect(result).to.equal(expected)
  })
})

describe("getPreviousIndexWithDifferentOrder", () => {
  forEach([
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
  ]).it("Given tasks with order: %j, newPos: %j should return %j", (order, pos, expected) => {
    const tasks = order.map(order => ({order}))
    const result = Repository.getPreviousIndexWithDifferentOrder(tasks, pos)
    expect(result).to.equal(expected)
  })
})

describe('getTasksToModify', () => {
  forEach([
    [[4], [-10, -9, -8, -7, -6, null], 5],
    [[-20], [-10, -9, -8, -7, -6], 0],
    [[15], [-10, 0, 10, 20, 30, 40, 50], 3],
    [[5, 10, 15, 20, 25], [-10, 0, 10, 10, 10, 10, 30, 40, 50], 4],
    [[5, 10, 15, 20, 25], [-10, 0, 10, 10, 10, 10, 30, 40, 50], 5],
    [[-10], [null, null, null, 30, 40], 0]
  ]).it('Gets %j tasks to modify from task list %j when moving task to new position %j', (expected, taskList, newPos) => {
    const task = {}
    const tasksToModify = Repository.getTasksToModify(task, taskList.map((order, index) => ({order})), newPos);
    const tasksToModifyString = JSON.stringify(tasksToModify)
    const expectedString = JSON.stringify(expected.map(order => ({order})))
    tasksToModifyString.should.equal(expectedString)
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
    should(hideLists).deepEqual(['DOING']);
    expect(queryString).to.equal('tags=important');

  })

  it('should return an array of lists to hide if hide parameter is present', () => {
    const query = 'tags=important hide: DOING, DONE';
    const { hideLists, queryString } = parseHideListsFromQueryString(query);
    should(hideLists).deepEqual(['DOING', 'DONE']);
    expect(queryString).to.equal('tags=important');
  });

  it('should handle empty hide parameter', () => {
    const query = 'tags=important hide: ';
    const { hideLists, queryString } = parseHideListsFromQueryString(query);
    should(hideLists).deepEqual([]);
    expect(queryString).to.equal('tags=important');
  });
});
