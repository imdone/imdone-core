const Project = require('../lib/project')

var should = require('should'),
  expect = require('expect.js'),
  sinon = require('sinon'),
  Repository = require('../lib/repository'),
  Config = require('../lib/config'),
  File = require('../lib/file'),
  util = require('util'),
  path = require('path'),
  fs = require('fs'),
  { existsSync } = fs,
  wrench = require('wrench'),
  fsStore = require('../lib/mixins/repo-fs-store'),
  log = require('debug')('imdone-core:repository-spec'),
  constants = require('../lib/constants'),
  languages = require('../lib/languages'),
  eol = require('eol'),
  async = require('async')
const appContext = require('../lib/context/ApplicationContext')
const FileProjectContext = require('../lib/domain/entities/FileProjectContext')
const ProjectContext = require('../lib/ProjectContext')

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
    noOrderRepoDir = path.join(tmpReposDir, 'no-order-repo'),
    moveMetaOrderDir = path.join(tmpReposDir, 'move-meta-order'),
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
    appContext.register(FileProjectContext, new ProjectContext(repo))
    proj.init(function (err, files) {
      if (err) return done(err)
      expect(files.length).to.be(12)
      done()
    })
  })

  it('Should write and delete a file successfully', function (done) {
    appContext.register(FileProjectContext, new ProjectContext(repo1))
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
    appContext.register(FileProjectContext, new ProjectContext(repo1))
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

  it.skip('Should serialize and deserialize successfully', function (done) {
    console.log(`initializing repo at : ${repo.path}`)
    proj.init(function (err, files) {
      var sr = repo.serialize()
      Repository.deserialize(sr, function (err, newRepo) {
        newRepo = fsStore(newRepo)
        newproj.init(function (err) {
          newRepo.getFiles().length.should.be.exactly(repo.getFiles().length)
          newRepo.getTasks().length.should.be.exactly(repo.getTasks().length)
          newRepo.getLists().length.should.be.exactly(repo.getLists().length)
          done()
        })
      })
    })
  })

  it('Should find checkBox tasks', function (done) {
    appContext.register(FileProjectContext, new ProjectContext(repo))
    var config = new Config(constants.DEFAULT_CONFIG)
    // BACKLOG:-80 Test with changes to config
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
    repo.loadConfig = (cb) => {
      repo.updateConfig(config, cb)
    }
    proj.init(function (err, files) {
      if (err) return done(err)
      log('files:', files)
      const file = files.find((file) => file.path === 'checkbox-tasks.md')
      expect(file.tasks[1].text).to.equal('A checkbox task without a list')
      expect(err).to.be(null)
      expect(repo.files.length).to.be(12)
      done()
    })
  })

  describe('Repository.query', function () {
    it('Should should sort according to sort values', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo2))
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
    it('Should return false if no default file exists', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo))
      proj.init(function (err, files) {
        expect(repo.hasDefaultFile()).to.be(false)
        done()
      })
    })

    it('Should return true if readme.md file exists', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo))
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
      appContext.register(FileProjectContext, new ProjectContext(repo))
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
    it("should return undefined if a default file doesn't exist", function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo))
      proj.init(function (err, files) {
        expect(repo.getDefaultFile()).to.be(undefined)
        done()
      })
    })

    it('should return readme.md if it exist', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo))
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
      appContext.register(FileProjectContext, new ProjectContext(repo))
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
      appContext.register(FileProjectContext, new ProjectContext(repo))
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
      appContext.register(FileProjectContext, new ProjectContext(repo))
      repo.saveConfig(function (err) {
        expect(err).to.be(null)
        expect(fs.existsSync(configDir)).to.be(true)
        wrench.rmdirSyncRecursive(configDir, true)
        expect(fs.existsSync(configDir)).to.be(false)
        done()
      })
    })
  })

  describe('loadConfig', function (done) {
    it('Should load the config file', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo))
      repo.config = new Config(constants.DEFAULT_CONFIG)
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

  describe('renameList', function (done) {
    it('should modify the list name in tasks with a given list name', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, files) {
        expect(err).to.be(null)
        expect(repo1.getTasksInList('TODO').length).to.be(3)
        repo1.renameList('TODO', 'PLANNING', function (err) {
          expect(err).to.be(null)
          expect(repo1.getTasksInList('PLANNING').length).to.be(3)
          expect(repo1.getTasksInList('TODO').length).to.be(0)
          done()
        })
      })
    })
    it('should execute the callback with an error if the new list name is already in use', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, files) {
        expect(err).to.be(null)
        expect(repo1.getTasksInList('TODO').length).to.be(3)
        repo1.renameList('TODO', 'DOING', function (err) {
          expect(err).to.not.be.null
          done()
        })
      })
    })
  })

  describe('deleteTasks', () => {
    it('deletes all tasks', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todos = repo3.getTasksInList('TODO')
        repo3.deleteTasks(todos, function (err) {
          var todosNow = repo3.getTasksInList('TODO')
          expect(todosNow.length).to.be(0)
          done()
        })
      })
    })
  })

  describe('deleteTask', () => {
    it('deletes a task with blank lines', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('DOING')
        var taskToDelete = todo.find(
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todos = repo3.getTasksInList('TODO')

        async.until(
          function test(cb) {
            return todos.length === 0
          },
          function iter(next) {
            let task = todos.pop()
            const file = repo3.getFileForTask(task)
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        let todos = repo3.getTasksInList(list)

        async.until(
          function test(cb) {
            return todos.length === 0
          },
          function iter(next) {
            let task = todos.pop()
            const file = repo3.getFileForTask(task)
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
    it('modifies a description on a single line block comment', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '0'
        )
        expect(taskToModify.description.length).to.be(0)
        const content = `${taskToModify.text}
- description line 1
- description line 2`
        repo3.modifyTaskFromContent(taskToModify, content, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToModify = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '0'
          )
          expect(taskToModify.description.length).to.be(2)
          done()
        })
      })
    })
    it('removes a description from a TODO that starts on the same line as code', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '1'
        )
        expect(taskToModify.description.length).to.be(1)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '1'
            )
            expect(taskToModify.description.length).to.be(0)
            done()
          }
        )
      })
    })
    it('removes a a description from a TODO in a block comment', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '2'
        )
        expect(taskToModify.description.length).to.be(3)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '2'
            )
            expect(taskToModify.description.length).to.be(0)
            done()
          }
        )
      })
    })
    it('modifies a a description for a TODO in a block comment', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '2'
        )
        expect(taskToModify.description.length).to.be(3)
        const content = `${taskToModify.text}
- description line 1
- description line 2`
        repo3.modifyTaskFromContent(taskToModify, content, function (err) {
          var todo = repo3.getTasksInList('TODO')
          var taskToModify = todo.find(
            (task) => task.meta.id && task.meta.id[0] === '2'
          )
          expect(taskToModify.description.length).to.be(2)
          done()
        })
      })
    })
    it('removes a a description from a TODO on the same line as code with a description that ends with a block comment', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
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
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '4'
        )
        expect(taskToModify.description.length).to.be(2)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '4'
            )
            expect(taskToModify.description.length).to.be(0)
            done()
          }
        )
      })
    })
    it('ends the description on blank comment lines', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var trickyTasks = repo3.getFile('tricky.js').getTasks()
        const task_a1 = trickyTasks.find(
          (task) => task.meta.id && task.meta.id[0] === 'a1'
        )
        const task_a3 = trickyTasks.find(
          (task) => task.meta.id && task.meta.id[0] === 'a3'
        )
        expect(task_a1.description.length).to.be(1)
        expect(task_a3.description.length).to.be(2)
        done()
      })
    })
    it('removes a description from a TODO with a description in a yaml file', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        var todo = repo3.getTasksInList('TODO')
        var taskToModify = todo.find(
          (task) => task.meta.id && task.meta.id[0] === '999'
        )
        expect(taskToModify.description.length).to.be(1)
        repo3.modifyTaskFromContent(
          taskToModify,
          taskToModify.text,
          function (err) {
            var todo = repo3.getTasksInList('TODO')
            var taskToModify = todo.find(
              (task) => task.meta.id && task.meta.id[0] === '999'
            )
            expect(taskToModify.description.length).to.be(0)
            done()
          }
        )
      })
    })
  })

  describe('addTaskToFile', function (done) {
    it("Adds a task to a file that doesn't exist with order = null", (done) => {
      const content = 'A task'
      const testFilePath = 'addTaskTest.md'
      const filePath = path.join(repo3.path, testFilePath)
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        repo3.addTaskToFile(filePath, 'DOING', content, (err, file) => {
          repo3.readFileContent(file, (err, file) => {
            const lines = eol.split(file.content)
            new RegExp(`\#DOING A task.* order:.*`)
              .test(lines.slice(5).join(' '))
              .should.be.true()
            expect(err).to.be(null)
            done()
          })
        })
      })
    })

    it('Adds a task to a file with HASH_META_ORDER', (done) => {
      appContext.register(FileProjectContext, new ProjectContext(repo3))
      proj3.init(function (err, result) {
        const content = 'A task\n<!-- order:40 -->\n'
        const testFilePath = 'addTaskTest.md'
        const filePath = path.join(repo3.path, testFilePath)
        const expectedLines = JSON.stringify([
          '- [ ] #DOING A task',
          '  <!-- order:40 -->',
          '  ',
        ])
        repo3.addTaskToFile(filePath, 'DOING', content, (err, file) => {
          // BACKLOG:-110 make sure the task is added correctly
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
    it('Should find tasks with tags=/one\\/two/', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
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
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, result) {
        const lists = repo1.query('tags=one')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          1
        )
        done()
      })
    })
    it('Should filter tasks by modified time with rql', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, result) {
        const lists = repo1.query('list=DOING')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          3
        )
        done()
      })
    })
    it('Should filter tasks by modified time monquery', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
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
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, result) {
        const lists = repo1.query('DOING')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          3
        )
        done()
      })
    })
    it('Should return a result with a bad query', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, result) {
        const lists = repo1.query('^&%^')
        expect(lists.find((list) => list.name === 'DOING').tasks.length).to.be(
          0
        )
        done()
      })
    })
    it('should query using dates', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
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
      appContext.register(FileProjectContext, new ProjectContext(repo1))
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
      appContext.register(FileProjectContext, new ProjectContext(repo1))
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
    it('Should move a task in a file with task-meta-order', (done) => {
      const listName = 'DOING'
      appContext.register(
        FileProjectContext,
        new ProjectContext(moveMetaOrderRepo)
      )
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

    it('should move a task to the proper location even if other tasks around it have the same order', (done) => {
      const listName = 'DOING'
      appContext.register(FileProjectContext, new ProjectContext(noOrderRepo))
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

    it('should move a task with blank lines, without adding more blank lines', (done) => {
      const listName = 'DOING'
      proj3.init((err, result) => {
        const projectContext = new ProjectContext(repo3)
        projectContext.config.settings.doneList = 'DONE'
        projectContext.config.settings.cards.metaNewLine = true
        projectContext.config.settings.cards.trackChanges = true
        appContext.register(FileProjectContext, projectContext)
        var list = repo3.getTasksInList(listName)
        var task = list.find(({ meta }) => meta.id && meta.id[0] === '7')
        const lastLine = task.lastLine
        repo3.moveTask({ task, newList: 'TODO', newPos: 2 }, (err) => {
          expect(err).to.be(null)
          var list = repo3.getTasksInList('TODO')
          var task = list.find(({ meta }) => meta.id && meta.id[0] === '7')
          const file = repo3.getFile(task.source.path)
          task.should.be.ok()
          task.lastLine.should.equal(lastLine + 8)
          done()
        })
      })
    })

    it('should move two tasks in the same file and extract the latest tasks', (done) => {
      var config = new Config(constants.DEFAULT_CONFIG)
      // BACKLOG:-90 Test with changes to config
      config.settings = {
        doneList: 'DONE',
        cards: { metaNewLine: true, trackChanges: true },
      }
      appContext.register(FileProjectContext, new ProjectContext(repo))
      repo.loadConfig = (cb) => {
        repo.updateConfig(config, cb)
      }
      proj.init((err, result) => {
        const moveTasksFilePath = 'move-tasks.md'
        repo.getFiles().forEach((file) => {
          if (file.path !== moveTasksFilePath) {
            repo.removeFile(file)
          }
        })
        const file = repo.getFile(moveTasksFilePath)
        const tasks = file.getTasks()
        const story2 = tasks.find((task) => task.text === 'Story 2')
        const story3 = tasks.find((task) => task.text === 'Story 3')
        story2.line.should.equal(21)
        story3.line.should.equal(28)
        const newPos = repo.getTasksInList('DOING').length
        repo.moveTask(
          { task: story2, newList: 'DOING', newPos },
          (err, task) => {
            const file = repo.getFile(moveTasksFilePath)
            const story3 = file
              .getTasks()
              .find((task) => task.text === 'Story 3')
            story3.line.should.equal(29)
            done()
          }
        )
      })
    })
  })

  describe('moveTasks', function () {
    it('Should move a task to the requested location in the requested list', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, result) {
        var todo = repo1.getTasksInList('TODO')
        var taskToMove = todo[1]
        console.log(taskToMove)
        repo1.moveTasks([taskToMove], 'DOING', 1, function (err) {
          expect(err).to.be(undefined)
          var doing = repo1.getTasksInList('DOING')
          taskToMove.equals(doing[1]).should.be.true
          done()
        })
      })
    })

    it('Should move a task to the requested location in the same list', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj1.init(function (err, result) {
        var todo = repo1.getTasksInList('TODO')
        var taskToMove = todo[1]
        console.log(taskToMove)
        repo1.moveTasks([taskToMove], 'TODO', 2, function () {
          taskToMove.equals(repo1.getTasksInList('TODO')[2]).should.be.true
          done()
        })
      })
    })

    it.skip('Should move multiple tasks to the requested location in the requested list', function (done) {
      appContext.register(FileProjectContext, new ProjectContext(repo1))
      proj.init(function (err, result) {
        var tasksToMove = repo.getTasksInList('TODO')
        repo.moveTasks(tasksToMove, 'DONE', 0, function () {
          repo.getTasksInList('TODO').length.should.be.exactly(0)
          repo.getTasksInList('DONE').length.should.be.exactly(8)
          done()
        })
      })
    })
  })

  describe('getTasksByList', () => {
    it('should return tasks in a filtered list', function (done) {
      appContext.register(
        FileProjectContext,
        new ProjectContext(defaultCardsRepo)
      )
      defaultCardsProj.init(function (err, result) {
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
        lists[0].tasks[11].order.should.be.exactly(0)
        done()
      })
    })
  })

  describe('It should allow : or :: in config.settings.metaSep', function () {
    it('should read metaData with a :: as sep', function (done) {
      appContext.register(
        FileProjectContext,
        new ProjectContext(metaSepTestRepo)
      )
      metaSepTestProj.init((err, result) => {
        const files = metaSepTestRepo.files
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
      appContext.register(
        FileProjectContext,
        new ProjectContext(metaSepTestRepo)
      )
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
          async (err) => {
            if (err) return done(err)
            getTask().metaKeys.includes('expand').should.be.true()
            await metaSepTestProj.removeMetadata(getTask(), 'expand', '1')
            getTask().metaKeys.includes('expand').should.be.false()
            done()
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
      appContext.register(FileProjectContext, new ProjectContext(repo))
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
