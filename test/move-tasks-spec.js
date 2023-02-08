const Project = require('../lib/project')
const expect = require('expect.js')
const Repository = require('../lib/repository')
const Config = require('../lib/config')
const path = require('path')
const fs = require('fs')
const { existsSync } = fs
const wrench = require('wrench')
const fsStore = require('../lib/mixins/repo-fs-store')
const ApplicationContext = require('../lib/context/ApplicationContext')
const ProjectContext = require('../lib/ProjectContext')
const constants = require('../lib/constants')
const TODO = "TODO"
const DOING = "DOING"
const DONE = "DONE"

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

function _beforeEach(done) {
    createDir(tmpDir)

    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, { forceDelete: true })
    wrench.copyDirSyncRecursive(filesSrc, repoDir, { forceDelete: true })
    repo = fsStore(new Repository(repoDir))
    proj = new Project(repo)
    repo1 = fsStore(new Repository(repo1Dir))
    proj1 = new Project(repo1)
    done()
}

function _afterEach(done) {
    proj1.destroy()
    proj.destroy()
    wrench.rmdirSyncRecursive(tmpDir, true)
    done()
}

function createDir(tmpDir) {
    try {
        if (existsSync(tmpDir)) {
            wrench.rmdirSyncRecursive(tmpDir)
        }
        wrench.mkdirSyncRecursive(tmpDir)
    } catch (e) {
        return done(e)  
    }
}

function createTmpRepo(name, files = []) {
    const repoDir = path.join(tmpDir, name)
    createDir(repoDir)
    files.forEach(({name, content}) => {
        fs.writeFileSync(path.join(repoDir, name), content, 'utf8')
    })
    return  fsStore(new Repository(repoDir))
}

function initProject({repo, config = {}}, cb) {
    const _config = Config.newDefaultConfig(config)
    ApplicationContext.config = _config
    ApplicationContext.projectContext = new ProjectContext(repo)
    const proj = new Project(repo)
    repo.config = _config
    repo.loadConfig = (cb) => {
      repo.updateConfig(_config, cb)
    }
    proj.init(cb)
}

describe('moveTasks', function () {

    beforeEach(_beforeEach)

    afterEach(_afterEach)

    it('Should move a task to the requested location in the same list', function (done) {
        ApplicationContext.projectContext = new ProjectContext(repo1)
        proj1.init(function (err, result) {
            var todo = repo1.getTasksInList(TODO)
            var taskToMove = todo[1]
            repo1.moveTasks([taskToMove], TODO, 2, function () {
                taskToMove.equals(repo1.getTasksInList(TODO)[2]).should.be.true
                done()
            })
        })
    })

    it('Should move a task to the requested location in a different list', function (done) {
        ApplicationContext.projectContext = new ProjectContext(repo1)
        proj1.init(function (err, result) {
            var todo = repo1.getTasksInList(TODO)
            var taskToMove = todo[1]
            repo1.moveTasks([taskToMove], DOING, 1, function (err) {
                expect(err).to.be(undefined)
                var doing = repo1.getTasksInList(DOING)
                taskToMove.equals(doing[1]).should.be.true
                done()
            })
        })
    })

    it('Should move multiple tasks to the requested location in the requested list', function (done) {
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }
        }, (err, result) => {
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
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }}, (err, result) => {
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

    // Test modifying markdown tasks and order meta switch
    // We should be able to perform the following operations on a markdown task with no order
    // - [ ] move task
    // - [ ] move task after task with no order
    // - [ ] modify task 
    // - [ ] modify task from content
    // - [ ] modify task from html
    // - [ ] switch between orderMeta true/false
    // describe('Modify markdown tasks and order meta switch', () => {
    //     beforeEach(_beforeEach)

    //     afterEach(_afterEach)

    it('Move a markdown task with no order, orderMeta = true', (done) => {
        const filePath =  'modify-tasks.md'
        const taskFilter = ({line}) => line === 35
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }}, (err) => {
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
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: false,
                    defaultList: TODO
                }
            }
          }}, (err) => {
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
        const taskFilter = ({meta, list}) => meta.story && meta.story[0] === '3' && list === TODO
        const taskWithNoOrderFilter = ({meta, list}) => meta.story && meta.story[0] === '4' && list === TODO
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }}, (err) => {
            if (err) return done(err)
            const listLengthTODO = repo.getTasksInList(TODO).length
            const listLengthDOING = repo.getTasksInList(DOING).length
            const tasksInDONE = repo.getTasksInList(DONE)
            const listLengthDONE = tasksInDONE.length

            const file = repo.getFile(filePath)
            const task = file.getTasks().find(taskFilter)
            const todoTasks = repo.getTasksInList(TODO);
            const newPos = todoTasks.findIndex(taskWithNoOrderFilter) + 1
            repo.moveTask({task, newList: TODO, newPos}, (err) => {
                if (err) return done(err)
                const newTask = file.getTasks().find(taskFilter)
                const newTodoTasks = repo.getTasksInList(TODO)
                const taskAtNewPosition = newTodoTasks[newPos]
                expect(ApplicationContext.config.orderMeta).to.be.true
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
    
    it('Moves a markdown task from position 0 to position 1 in a list with 3 tasks all with no order', (done) => {
        const repo = createTmpRepo("tmp-repo-1", [
            {
                name: "fileA.md",
                content: "## [Task a with no order](#TODO:)\ntask:a\n"
            },
            {
                name: "fileB.md",
                content: "## [Task b with no order](#TODO:)\ntask:b\n"
            },
            {
                name: "fileC.md",
                content: "## [Task c with no order](#TODO:)\ntask:c\n"
            },
        ])
        
        
        const taskAFilter = ({meta}) => meta.task && meta.task[0] === 'a'
        const taskBFilter = ({meta}) => meta.task && meta.task[0] === 'b'
        const taskCFilter = ({meta}) => meta.task && meta.task[0] === 'c'
        initProject({repo, config: {
            settings: {
                journalType: "New File",
                cards: {
                    orderMeta: false,
                    defaultList: TODO
                }
            }
          }}, (err) => {
            if (err) return done(err)
            const task = repo.getTasks().find(taskAFilter)
            const newPos = 1
            repo.moveTask({task, newList: TODO, newPos}, (err) => {
                if (err) return done(err)
                const taskA = repo.getTasks().find(taskAFilter)
                const taskB = repo.getTasks().find(taskBFilter)
                const taskC = repo.getTasks().find(taskCFilter)
                expect(taskA.order).to.be.a('number')
                expect(taskB.order).to.be.a('number')
                expect(taskB.order < taskA.order && taskA.order < taskC.order).to.be.true
                done()
            })
        })
    })

    it('Moves a markdown task after task with no order, orderMeta = false', (done) => {
        const repo = createTmpRepo("tmp-repo-2", [
            {
                name: "file1.md",
                content: "## [A task with order](#TODO:10)\nstory:3\n"
            },
            {
                name: "file2.md",
                content: "## [A task with no order](#TODO:)\nstory:4\n"
            }
        ])
        
        
        const taskFilter = ({meta}) => meta.story && meta.story[0] === '3'
        const taskWithNoOrderFilter = ({meta}) => meta.story && meta.story[0] === '4'
        initProject({repo, config: {
            settings: {
                journalType: "New File",
                cards: {
                    orderMeta: false,
                    defaultList: TODO
                }
            }
          }}, (err) => {
            if (err) return done(err)
            const listLengthTODO = repo.getTasksInList(TODO).length
            const listLengthDOING = repo.getTasksInList(DOING).length
            const listLengthDONE = repo.getTasksInList(DONE).length

            const task = repo.getTasks().find(taskFilter)
            const newPos = 1
            repo.moveTask({task, newList: TODO, newPos}, (err) => {
                if (err) return done(err)
                const newTask = repo.getTasks().find(taskFilter)
                const taskWithNoOrder = repo.getTasks().find(taskWithNoOrderFilter)
                const newTodoTasks = repo.getTasksInList(TODO)
                const taskAtNewPosition = newTodoTasks[newPos]
                expect(taskFilter(taskAtNewPosition)).to.be.true
                expect(taskWithNoOrder.order).to.be.a('number')
                expect(newTask.order).to.be.a('number');
                expect(taskWithNoOrder.order < newTask.order).to.be(true)
                expect(newTodoTasks.length).to.equal(listLengthTODO)
                expect(repo.getTasksInList(DOING).length).to.equal(listLengthDOING)
                expect(repo.getTasksInList(DONE).length).to.equal(listLengthDONE)
                done()
                // done("This isn't working on the front end")
            })
        })
    })


    it('Modify a markdown task with no order, orderMeta = true', (done) => {
        const filePath =  'modify-tasks.md'
        const taskFilter = ({meta}) => meta.story && meta.story[0] === '4'
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }}, (err) => {
            
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
        initProject({repo, config: {
            settings: {
                cards: {
                    orderMeta: false,
                    defaultList: TODO
                }
            }
          }}, (err) => {
            
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
