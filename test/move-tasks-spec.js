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
const ProjectContext = require('../lib/ProjectContext')
const forEach = require("mocha-each")
const { createFileSystemProject } = require('../lib/project-factory')

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
    proj = createFileSystemProject({
        path: repoDir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
    repo = proj.repo
    proj1 = createFileSystemProject({
        path: repo1Dir,
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {} 
      })
    repo1 = proj1.repo

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

function createProject({repo, config = {}}) {
    const _config = Config.newDefaultConfig(config)
    appContext().config = _config
    appContext().projectContext = new ProjectContext(repo)
    const proj = new Project(repo)
    proj.pluginManager.loadInstalledPlugins = () => {}
    proj.pluginManager.loadPluginsNotInstalled = () => {}
    repo.config = _config
    repo.loadConfig = (cb) => {
      repo.updateConfig(_config, cb)
    }
    return proj
}

function initProject({repo, config = {}}, cb = () => {}) {
    createProject({repo, config}).init(cb)
}

describe('moveTasks', function () {

    beforeEach(_beforeEach)

    afterEach(_afterEach)

    it('Should move a task to the requested location in the same list', function (done) {
        appContext().projectContext = new ProjectContext(repo1)
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
        appContext().projectContext = new ProjectContext(repo1)
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
    
    it('moveTasksAsync Should move multiple tasks to the requested location in the requested list', function (done) {
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
            repo.moveTasksAsync(tasksToMove, DONE, 0)
            .then(() => {
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
    // it('Should move multiple tasks to the requested location in the requested list', function (done) {
    //     initProject({repo, config: {
    //         settings: {
    //             cards: {
    //                 orderMeta: true,
    //                 defaultList: TODO
    //             }
    //         }
    //       }
    //     }, (err, result) => {
    //         const fileTaskCounts = repo.getFiles().map(({path, tasks}) => {
    //             return {
    //                 path,
    //                 taskCount: tasks.length
    //             }
    //         })
    //         const tasksToMove = repo.getTasksInList(DOING)
    //         const listLengthDOING = tasksToMove.length
    //         const listLengthDONE = repo.getTasksInList(DONE).length
    //         const allTasksLength = repo.getTasks().length
    //         repo.moveTasks(tasksToMove, DONE, 0, function () {
    //             const fileTaskCountsResult = repo.getFiles().map(({path, tasks}) => {
    //                 return {
    //                     path,
    //                     taskCount: tasks.length
    //                 }
    //             })
    //             fileTaskCounts.forEach(({path, taskCount}) => {
    //                 const fileTaskCount = fileTaskCountsResult.find(a => a.path === path);
    //                 console.log(path);
    //                 should(taskCount).be.exactly(fileTaskCount && fileTaskCount.taskCount);
    //             })
    //             repo.getTasks().length.should.be.exactly(allTasksLength)
    //             repo.getTasksInList(DOING).length.should.be.exactly(0)
    //             repo.getTasksInList(DONE).length.should.be.exactly(listLengthDONE + listLengthDOING)
    //             done()
    //         })
    //     })
    // })

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
            const tasksToMove = repo.getFile(FILE_PATH).getTasks().filter(({line}) => line === 7)
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
                const newTODOListLength = repo.getTasksInList(TODO).length
                const newDONEListLength = repo.getTasksInList(DONE).length
                newTODOListLength.should.be.exactly(listLengthTODO + 1)
                newDONEListLength.should.be.exactly(listLengthDONE - 1)
                done()
            })
        })
    })

    it('Extracts a task with inline order and switches to orderMeta when the task is moved', (done) => {
        const content = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, i) => {
            const order = i * 10
            return `## #TODO:${order} Task ${letter}\ntask:${letter}\n`
        }).join('\n')
        const repoFiles = [
            {
                name: `file.md`,
                content
            }
        ]
        const repo = createTmpRepo("order-integrity", repoFiles)
        const proj = createProject({repo, init: false, config: {
            keepEmptyPriority: true,
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }
        })
        function destroyProject(done, err) {
            proj.destroy()
            done(err)
        }

        const getTask = () => repo.getTasksInList(TODO).find(({meta}) => meta.task[0] === 'A')

        proj.init((err) => {
            const task = getTask()
            if (err) destroyProject(done, err)
            repo.moveTask({ task, newList: DOING, newPos: 0 }, (err, task) => {
                task.content.should.equal("Task A\ntask:A\n<!-- order:0 -->")
                if (err) destroyProject(done, err)
                destroyProject(done, err)
            })
        })
    })

    forEach([
        [[null, null, null, null], 2, 1, [10, 20, 30, null]]
    ]).
    it('moves a task in %j from position %j to position %j and updates order', (tasks, fromPosition, toPosition, expected, done) => {
        const content = tasks.map((order, i) => {
            return `## #TODO:${order || ''} Task ${i}\ntask:${i}\n`
        }).join('\n')
        const repoFiles = [
            {
                name: `file.md`,
                content
            }
        ]
        const repo = createTmpRepo("order-integrity", repoFiles)
        const proj = createProject({repo, init: false, config: {
            keepEmptyPriority: true,
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
          }
        })
        function destroyProject(done, err) {
            proj.destroy()
            done(err)
        }

        const getTask = () => repo.getTasksInList(TODO).find(({meta}) => meta.task[0] === fromPosition + "")

        proj.init((err) => {
            const task = getTask()
            if (err) destroyProject(done, err)
            repo.moveTask({ task, newList: TODO, newPos: toPosition }, (err, task) => {
                const expectedOrder = expected[toPosition]
                task.content.should.equal(`Task ${fromPosition}\ntask:${fromPosition}\n<!-- order:${expectedOrder} -->`)
                if (err) destroyProject(done, err)
                destroyProject(done, err)
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
    forEach([
        [0, 9, 6, 0, 0, 10, true, true],
        [0, 9, 6, 0, 0, 10, false, true],
        [0, 9, 6, 0, 0, 10, true, false],
        [0, 9, 6, 0, 0, 10, false, false],
        [0, 5, 8, 0, 0, 10, true, true],
        [0, 5, 8, 0, 0, 10, false, true],
        [0, 5, 8, 0, 0, 10, true, false],
        [0, 5, 8, 0, 0, 10, false, false],
        [4, 7, 2, 0, 0, 10, true, true],
        [4, 7, 2, 0, 0, 10, false, true],
        [4, 7, 2, 0, 0, 10, true, false],
        [4, 7, 2, 0, 0, 10, false, false],
        [4, 2, 7, 0, 0, 10, true, true],
        [4, 2, 7, 0, 0, 10, false, true],
        [4, 2, 7, 0, 0, 10, true, false],
        [4, 2, 7, 0, 0, 10, false, false],
        // Move from end with null order to group with same order
        [6, 9, 4, 2, 6, 10, true, true],
        [6, 9, 4, 2, 6, 10, true, false],
        [6, 9, 4, 2, 6, 10, false, true],
        [6, 9, 4, 2, 6, 10, false, false],
        // Move from after with different order to group with same order
        [9, 7, 3, 2, 6, 10, true, true],
        [9, 7, 3, 2, 6, 10, true, false],
        [9, 7, 3, 2, 6, 10, false, true],
        [9, 7, 3, 2, 6, 10, false, false],
        // Move from after with same order to group with same order
        [6, 5, 3, 2, 6, 10, true, true],
        [6, 5, 3, 2, 6, 10, true, false],
        [6, 5, 3, 2, 6, 10, false, true],
        [6, 5, 3, 2, 6, 10, false, false],
        // Move from before with different order to group with same order
        [12, 2, 5, 3, 7, 10, true, true],
        [12, 2, 5, 3, 7, 10, true, false],
        [12, 2, 5, 3, 7, 10, false, true],
        [12, 2, 5, 3, 7, 10, false, false],
        // Move from before with same order to group with same order
        [12, 4, 6, 3, 8, 10, true, true],
        [12, 4, 6, 3, 8, 10, true, false],
        [12, 4, 6, 3, 8, 10, false, true],
        [12, 4, 6, 3, 8, 10, false, false],
        // Move to top of list when first three cards have 0 order
        [12, 2, 0, 0, 2, 10, true, true],
        [12, 2, 0, 0, 2, 10, true, false],
        [12, 2, 0, 0, 2, 10, false, true],
        [12, 2, 0, 0, 2, 10, false, false],
        // Negative order
        [12, 0, 25, 3, 4, -10, true, true],
    ]).
    it('Moves a markdown task in a list with %j tasks with order from pos %j to pos %j, where pos %j - %j have same order, order is index * %j, orderMeta = %j, keepEmptyPriority = %j', 
        (tasksWithOrder, fromPos, toPos, sameOrderFrom, sameOrderTo, orderMulti, orderMeta, keepEmptyPriority, done) => {
        
        let sameOrder
        const repoFiles = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, i) => {
            let order = i < tasksWithOrder ? i*orderMulti : ''
            if (i === sameOrderFrom) sameOrder = order
            if (i > sameOrderFrom && i <= sameOrderTo) order = sameOrder
            return {
                name: `file${letter}.md`,
                content: `## [Task ${letter}](#TODO:${order})\ntask:${letter}\n`
            }
        })

        const repo = createTmpRepo("tmp-repo-1", repoFiles)
        const proj = createProject({repo, init: false, config: {
            keepEmptyPriority,
            settings: {
                cards: {
                    orderMeta,
                    defaultList: TODO
                }
            }
          }
        })

        function destroyProject(done, err) {
            proj.destroy()
            done(err)
        }

        proj.init((err) => {
            if (err) destroyProject(done, err)
            const todoTasks = repo.getTasksInList(TODO)
            const task = todoTasks[fromPos]
            const letter = task.meta.task[0]
            console.log(this.ctx.test.title)
            console.log(`task: ${letter}`)
            console.log(todoTasks.map(({order, meta}, i) => `${i} : ${meta.task[0]} : ${order}`))
            const taskFilter =  ({meta}) => meta.task[0] === letter
            const newPos = toPos
            repo.moveTask({task, newList: TODO, newPos}, (err) => {
                if (err) destroyProject(done, err)
                const todoTasks = repo.getTasksInList(TODO)
                const task = todoTasks.find(taskFilter)
                const newTaskIndex= todoTasks.findIndex(taskFilter)
                console.log(`task: ${letter}`)
                console.log(todoTasks.map(({order, meta}, i) => `${i} : ${meta.task[0]} : ${order}`))
                should(task.meta.task[0]).equal(letter)
                should(newTaskIndex).equal(newPos)
                destroyProject(done, err)
            })
        })
    })

    forEach([
        [0, 9, 6, 0, 0, true, true],
        [0, 9, 6, 0, 0, false, true],
        [0, 9, 6, 0, 0, true, false],
        [0, 9, 6, 0, 0, false, false],
        [0, 5, 8, 0, 0, true, true],
        [0, 5, 8, 0, 0, false, true],
        [0, 5, 8, 0, 0, true, false],
        [0, 5, 8, 0, 0, false, false],
        [4, 7, 2, 0, 0, true, true],
        [4, 7, 2, 0, 0, false, true],
        [4, 7, 2, 0, 0, true, false],
        [4, 7, 2, 0, 0, false, false],
        [4, 2, 7, 0, 0, true, true],
        [4, 2, 7, 0, 0, false, true],
        [4, 2, 7, 0, 0, true, false],
        [4, 2, 7, 0, 0, false, false],
        // Move from end with null order to group with same order
        [6, 9, 4, 2, 6, true, true],
        [6, 9, 4, 2, 6, true, false],
        [6, 9, 4, 2, 6, false, true],
        [6, 9, 4, 2, 6, false, false],
        // Move from after with different order to group with same order
        [9, 7, 3, 2, 6, true, true],
        [9, 7, 3, 2, 6, true, false],
        [9, 7, 3, 2, 6, false, true],
        [9, 7, 3, 2, 6, false, false],
        // Move from after with same order to group with same order
        [6, 5, 3, 2, 6, true, true],
        [6, 5, 3, 2, 6, true, false],
        [6, 5, 3, 2, 6, false, true],
        [6, 5, 3, 2, 6, false, false],
        // Move from before with different order to group with same order
        [12, 2, 5, 3, 7, true, true],
        [12, 2, 5, 3, 7, true, false],
        [12, 2, 5, 3, 7, false, true],
        [12, 2, 5, 3, 7, false, false],
        // Move from before with same order to group with same order
        [12, 4, 6, 3, 8, true, true],
        [12, 4, 6, 3, 8, true, false],
        [12, 4, 6, 3, 8, false, true],
        [12, 4, 6, 3, 8, false, false],
    ]).
    it('Same File - Move a markdown task with blank lines in a list with %j tasks with order from pos %j to pos %j, where pos %j - %j have same order, orderMeta = %j, keepEmptyPriority = %j', 
        (tasksWithOrder, fromPos, toPos, sameOrderFrom, sameOrderTo, orderMeta, keepEmptyPriority, done) => {
        
        let sameOrder
        const content = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, i) => {
            let order = i < tasksWithOrder ? i*10 : ''
            if (i === sameOrderFrom) sameOrder = order
            if (i > sameOrderFrom && i <= sameOrderTo) order = sameOrder
            return `## [Task ${letter}](#TODO:${order})\n<card>\nSome content\n\nMore content\n\n<!--\ntask:${letter}\n-->\n</card>\n`
        }).join("\n")

        const repoFiles = [{
            name: "test-file.md",
            content
        }]
        
        const repo = createTmpRepo("tmp-repo-1", repoFiles)
        const proj = createProject({repo, init: false, config: {
            keepEmptyPriority,
            settings: {
                cards: {
                    orderMeta,
                    defaultList: TODO
                }
            }
          }
        })

        function destroyProject(done, err) {
            proj.destroy()
            done(err)
        }

        proj.init((err) => {
            if (err) destroyProject(done, err)
            const todoTasks = repo.getTasksInList(TODO)
            const task = todoTasks[fromPos]
            const letter = task.meta.task[0]
            console.log(this.ctx.test.title)
            console.log(`task: ${letter}`)
            console.log(todoTasks.map(({order, meta}, i) => `${i} : ${meta.task[0]} : ${order}`))
            const taskFilter =  ({meta}) => meta.task[0] === letter 
            const newPos = toPos
            repo.moveTask({task, newList: TODO, newPos}, (err) => {
                if (err) destroyProject(done, err)
                const todoTasks = repo.getTasksInList(TODO)
                const newTaskIndex= todoTasks.findIndex(taskFilter)
                console.log(`task: ${letter}`)
                console.log(todoTasks.map(({order, meta}, i) => `${i} : ${meta.task[0]} : ${order}`))
                should(newTaskIndex).equal(newPos)
                destroyProject(done, err)
            })
        })
    })

    // it('should move a task with blank lines, without adding more blank lines', (done) => {
    //     const listName = 'DOING'
    //     appContext().projectContext = new ProjectContext(repo3)
    //     repo3.loadConfig = (cb) => {
    //       const config = appContext().config
    //       config.settings.doneList = 'DONE'
    //       config.settings.cards = {
    //         metaNewLine: true,
    //         trackChanges: true
    //       }
    //       repo3.updateConfig(config, cb)
    //     }
  
    //     proj3.init((err, result) => {
    //       var list = repo3.getTasksInList(listName)
    //       var task = list.find(({ meta }) => meta.id && meta.id[0] === '7')
    //       const lastLine = task.lastLine
    //       repo3.moveTask({ task, newList: 'TODO', newPos: 2 }, (err) => {
    //         if (err) return done(err)
    //         expect(err).to.be(null)
    //         var list = repo3.getTasksInList('TODO')
    //         var task = list.find(({ meta }) => meta.id && meta.id[0] === '7')
    //         const file = repo3.getFile(task.source.path)
    //         task.should.be.ok()
    //         task.lastLine.should.equal(lastLine)
    //         done()
    //       })
    //     })
    //   })  

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
            keepEmptyPriority: false,
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
    // it('Modify a markdown task from content with no order, orderMeta = true', (done) => {
    //     done('Write test')
    // })
    // it('Modify a markdown task from content with no order, orderMeta = false', (done) => {
    //     done('Write test')
    // })

    // it('Modify a markdown task from html with no order, orderMeta = true', (done) => {
    //     done('Write test')
    // })
    // it('Modify a markdown task from html with no order, orderMeta = false', (done) => {
    //     done('Write test')
    // })
})
