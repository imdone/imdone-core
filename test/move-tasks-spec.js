const Project = require('../lib/project')
const expect = require('expect.js')
const Repository = require('../lib/repository')
const Config = require('../lib/config')
const path = require('path')
const fs = require('fs')
const { existsSync } = fs
const wrench = require('wrench')
const fsStore = require('../lib/mixins/repo-fs-store')
const appContext = require('../lib/context/ApplicationContext')
const FileProjectContext = require('../lib/domain/entities/FileProjectContext')
const ProjectContext = require('../lib/ProjectContext')
const constants = require('../lib/constants')
const TODO = "TODO"
const DOING = "DOING"
const DONE = "DONE"


describe('moveTasks', function () {
    var tmpDir = path.join(process.cwd(), 'tmp'),
    tmpReposDir = path.join(tmpDir, 'repos'),
    repoSrc = path.join(process.cwd(), 'test', 'repos'),
    filesSrc = path.join(process.cwd(), 'test', 'files'),
    repoDir = path.join(tmpReposDir, 'files'),
    repo1Dir = path.join(tmpReposDir, 'repo1'),
    repo,
    repo1,
    proj,
    proj1

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
        repo1 = fsStore(new Repository(repo1Dir))
        proj1 = new Project(repo1)
        done()
    })

    afterEach(function (done) {
        proj1.destroy()
        proj.destroy()
        wrench.rmdirSyncRecursive(tmpDir, true)
        done()
    })



    it('Should move a task to the requested location in the same list', function (done) {
        appContext.register(FileProjectContext, new ProjectContext(repo1))
        proj1.init(function (err, result) {
            var todo = repo1.getTasksInList(TODO)
            var taskToMove = todo[1]
            console.log(taskToMove)
            repo1.moveTasks([taskToMove], TODO, 2, function () {
                taskToMove.equals(repo1.getTasksInList(TODO)[2]).should.be.true
                done()
            })
        })
    })

    it('Should move a task to the requested location in the requested list', function (done) {
        appContext.register(FileProjectContext, new ProjectContext(repo1))
        proj1.init(function (err, result) {
            var todo = repo1.getTasksInList(TODO)
            var taskToMove = todo[1]
            console.log(taskToMove)
            repo1.moveTasks([taskToMove], DOING, 1, function (err) {
                expect(err).to.be(undefined)
                var doing = repo1.getTasksInList(DOING)
                taskToMove.equals(doing[1]).should.be.true
                done()
            })
        })
    })

    it('Should move multiple tasks to the requested location in the requested list', function (done) {
        appContext.register(FileProjectContext, new ProjectContext(repo))
        var config = new Config(constants.DEFAULT_CONFIG)
        config.settings = {
            cards: {
              defaultList: TODO,
            },
          }
        // BACKLOG:-80 Test with changes to config
        repo.config = config
        repo.loadConfig = (cb) => {
          repo.updateConfig(config, cb)
        }
        proj.init(function (err, result) {
            const fileTaskCounts = repo.getFiles().map(({path, tasks}) => {
                return {
                    path,
                    taskCount: tasks.length
                }
            })
            const tasksToMove = repo.getTasksInList(DOING)
            const listLengthDOING = tasksToMove.length
            const listLengthDONE = repo.getTasksInList(DONE).length
            const allTasksLength = repo.getTasks().length
            repo.moveTasks(tasksToMove, DONE, 0, function () {
                const fileTaskCountsResult = repo.getFiles().map(({path, tasks}) => {
                    return {
                        path,
                        taskCount: tasks.length
                    }
                })
                fileTaskCounts.forEach(({path, taskCount}) => {
                    const fileTaskCount = fileTaskCountsResult.find(a => a.path === path);
                    console.log(path);
                    should(taskCount).be.exactly(fileTaskCount && fileTaskCount.taskCount);
                })
                repo.getTasks().length.should.be.exactly(allTasksLength)
                repo.getTasksInList(DOING).length.should.be.exactly(0)
                repo.getTasksInList(DONE).length.should.be.exactly(listLengthDONE + listLengthDOING)
                done()
            })
        })
    })

    it('Should move multiple tasks in a code file to the requested location in the requested list', function (done) {
        const FILE_PATH = 'test.js'
        appContext.register(FileProjectContext, new ProjectContext(repo))
        var config = new Config(constants.DEFAULT_CONFIG)
        config.settings = {
            cards: {
              defaultList: TODO,
            },
          }
        repo.config = config
        repo.loadConfig = (cb) => {
          repo.updateConfig(config, cb)
        }
        proj.init(function (err, result) {
            const fileTaskCounts = repo.getFiles().map(({path, tasks}) => {
                return {
                    path,
                    taskCount: tasks.length
                }
            })
            const tasksToMove = repo.getFile(FILE_PATH).getTasks().filter(({line}) => line === 4)
            const listLengthTODO = repo.getTasksInList(TODO).length
            const listLengthDONE = repo.getTasksInList(DONE).length
            const allTasksLength = repo.getTasks().length
            repo.moveTasks(tasksToMove, TODO, 0, function () {
                const fileTaskCountsResult = repo.getFiles().map(({path, tasks}) => {
                    return {
                        path,
                        taskCount: tasks.length
                    }
                })
                fileTaskCounts.forEach(({path, taskCount}) => {
                    const fileTaskCount = fileTaskCountsResult.find(a => a.path === path);
                    console.log(path);
                    should(`${path}:${taskCount}`).be.exactly(`${fileTaskCount.path}:${fileTaskCount.taskCount}`);
                })
                repo.getTasks().length.should.be.exactly(allTasksLength)
                repo.getTasksInList(TODO).length.should.be.exactly(listLengthTODO + 1)
                repo.getTasksInList(DONE).length.should.be.exactly(listLengthDONE - 1)
                done()
            })
        })
    })

    function initProject({repo, cardsConfig = {}}, cb) {
        appContext.register(FileProjectContext, new ProjectContext(repo))
        var config = new Config(constants.DEFAULT_CONFIG)
        config.settings = {
            cards: {
              defaultList: TODO,
              orderMeta: true,
              ...cardsConfig
            },
          }
        repo.config = config
        repo.loadConfig = (cb) => {
          repo.updateConfig(config, cb)
        }
        proj.init(cb)
    }

    // Test modifying markdown tasks and order meta switch
    // We should be able to perform the following operations on a markdown task with no order
    // - [ ] move task
    // - [ ] move task after task with no order
    // - [ ] modify task 
    // - [ ] modify task from content
    // - [ ] modify task from html
    // - [ ] switch between orderMeta true/false
    describe('Modify markdown tasks and order meta switch', () => {
        it('Move a markdown task with no order, orderMeta = true', (done) => {
            const filePath =  'modify-tasks.md'
            const taskFilter = ({line}) => line === 35
            initProject({repo}, (err) => {
                const file = repo.getFile(filePath)
                const task = file.getTasks().find(taskFilter)
                repo.moveTask({task, newList: TODO, newPos: 0}, (err) => {
                    const newTask = file.getTasks().find(taskFilter)
                    should(newTask.meta.order[0]).equal('-30')
                    should(newTask.order).equal(-30)
                    done()
                })
            })
        })

        it('Move a markdown task with no order, orderMeta = false', (done) => {
            const filePath =  'modify-tasks.md'
            const taskFilter = ({line}) => line === 35
            initProject({repo, cardsConfig: {orderMeta: false}}, (err) => {
                const file = repo.getFile(filePath)
                const task = file.getTasks().find(taskFilter)
                repo.moveTask({task, newList: TODO, newPos: 0}, (err) => {
                    const newTask = file.getTasks().find(taskFilter)
                    should(repo.getTasksInList(TODO).findIndex(t => newTask === t)).equal(0)
                    should(newTask.meta.order).equal(undefined)
                    should(newTask.order).equal(-30)
                    done()
                })
            })
        })

        it('Move a markdown task after task with no order, orderMeta = true', (done) => {
            const filePath =  'modify-tasks.md'
            const taskFilter = ({meta}) => meta.story && meta.story[0] === '3'
            const taskWithNoOrderFilter = ({meta}) => meta.story && meta.story[0] === '4'
            initProject({repo, cardsConfig: {orderMeta: true}}, (err) => {
                const listLengthTODO = repo.getTasksInList(TODO).length
                const listLengthDOING = repo.getTasksInList(DOING).length
                const listLengthDONE = repo.getTasksInList(DONE).length
    
                const file = repo.getFile(filePath)
                const task = file.getTasks().find(taskFilter)
                const todoTasks = repo.getTasksInList(TODO);
                const newPos = todoTasks.findIndex(taskWithNoOrderFilter) + 1
                repo.moveTask({task, newList: TODO, newPos}, (err) => {
                    const newTask = file.getTasks().find(taskFilter)
                    const newTodoTasks = repo.getTasksInList(TODO)
                    const taskAtNewPosition = newTodoTasks[newPos]
                    expect(taskFilter(taskAtNewPosition)).to.be.true
                    expect(newTask.meta.order[0]).to.be(`${newTask.order}`)
                    expect(newTask.order).to.be.a('number');
                    expect(newTodoTasks.length).to.equal(listLengthTODO)
                    expect(repo.getTasksInList(DOING).length).to.equal(listLengthDOING)
                    expect(repo.getTasksInList(DONE).length).to.equal(listLengthDONE)
                    done()
                })
            })
        })
        it('Move a markdown task after task with no order, orderMeta = false', (done) => {
            const filePath =  'modify-tasks.md'
            const taskFilter = ({meta}) => meta.story && meta.story[0] === '3'
            const taskWithNoOrderFilter = ({meta}) => meta.story && meta.story[0] === '4'
            initProject({repo, cardsConfig: {orderMeta: false}}, (err) => {
                const listLengthTODO = repo.getTasksInList(TODO).length
                const listLengthDOING = repo.getTasksInList(DOING).length
                const listLengthDONE = repo.getTasksInList(DONE).length
    
                const file = repo.getFile(filePath)
                const task = file.getTasks().find(taskFilter)
                const todoTasks = repo.getTasksInList(TODO);
                const newPos = todoTasks.findIndex(taskWithNoOrderFilter) + 1
                repo.moveTask({task, newList: TODO, newPos}, (err) => {
                    const newTask = file.getTasks().find(taskFilter)
                    const newTodoTasks = repo.getTasksInList(TODO)
                    const taskAtNewPosition = newTodoTasks[newPos]
                    expect(taskFilter(taskAtNewPosition)).to.be.true
                    expect(newTask.order).to.be.a('number');
                    expect(newTodoTasks.length).to.equal(listLengthTODO)
                    expect(repo.getTasksInList(DOING).length).to.equal(listLengthDOING)
                    expect(repo.getTasksInList(DONE).length).to.equal(listLengthDONE)
                    done()
                })
            })
        })

        it('Modify a markdown task with no order, orderMeta = true', (done) => {
            const filePath =  'modify-tasks.md'
            const taskFilter = ({meta}) => meta.story && meta.story[0] === '4'
            initProject({repo, cardsConfig: {orderMeta: true}}, (err) => {
                
                const file = repo.getFile(filePath)
                const task = file.getTasks().find(taskFilter)
                task.text = 'Story 4 edited'
                repo.modifyTask(task, true, (err, file) => {
                    expect(file.getTasks().find(taskFilter).text).to.be('Story 4 edited')
                    done()
                })
            })
        })
        it('Modify a markdown task with no order, orderMeta = false', (done) => {
            const filePath =  'modify-tasks.md'
            const taskFilter = ({meta}) => meta.story && meta.story[0] === '4'
            initProject({repo, cardsConfig: {orderMeta: false}}, (err) => {
                
                const file = repo.getFile(filePath)
                const task = file.getTasks().find(taskFilter)
                task.text = 'Story 4 edited'
                repo.modifyTask(task, true, (err, file) => {
                    expect(file.getTasks().find(taskFilter).text).to.be('Story 4 edited')
                    done()
                })
            })
        })

        it('Modify a markdown task from content with no order, orderMeta = true', (done) => {
            done('Write test')
        })
        it('Modify a markdown task from content with no order, orderMeta = false', (done) => {
            done('Write test')
        })

        it('Modify a markdown task from html with no order, orderMeta = true', (done) => {
            done('Write test')
        })
        it('Modify a markdown task from html with no order, orderMeta = false', (done) => {
            done('Write test')
        })
    })    
})
