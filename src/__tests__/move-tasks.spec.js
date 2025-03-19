import { describe, it, expect, should, beforeEach, afterEach } from 'vitest'
import { Config } from '../config'
import path from 'path'
import { writeFile, mkdtemp } from 'fs/promises'
import { createFileSystemProject } from '../project-factory'
import { getFreshRepoTestData } from './helper'
import os from 'os'

const TODO = "TODO"
const DOING = "DOING"
const DONE = "DONE"
// TODO Modernize this test
// #important #urgent
// <!--
// order:-225
// -->
var 
repoDir,
repo1Dir,
repo,
repo1,
proj,
proj1

async function getFreshRepoAndProject(config = {}) {
    const path = await getFreshRepoTestData('files')
    const project = createFileSystemProject({
        path,
        config: Config.newDefaultConfig(config),
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {}
    })
    const repo = project.repo
    return { project, repo }
}

async function _beforeEach() {
    repoDir = await getFreshRepoTestData('files')
    repo1Dir = await getFreshRepoTestData('repo1')
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
}

async function _afterEach() {
    proj1.destroy()
    proj.destroy()
}

async function createTmpProject({name, config = {}, files = []}) {
    const repoDir = await mkdtemp(path.join(os.tmpdir(), `imdone-core-test-${name}-`));
    for (const { name, content} of files) {
        await writeFile(path.join(repoDir, name), content)
    }
    const project = createFileSystemProject({
        path: repoDir,
        config: Config.newDefaultConfig(config),
        loadInstalledPlugins: () => {},
        loadPluginsNotInstalled: () => {}
    })

    const repo = project.repo
    return {project, repo, root: repoDir}
}


describe('moveTasks', function () {

    beforeEach(_beforeEach)

    afterEach(_afterEach)

    it('Should move a task to the requested location in the same list', async () => {
        await proj1.init()
        var todo = repo1.getTasksInList(TODO)
        var taskToMove = todo[1]
        await repo1.moveTasks([taskToMove], TODO, 2)
        expect(taskToMove.equals(repo1.getTasksInList(TODO)[2])).to.be.true
    })

    it('Should move a task to the requested location in a different list', async () => {
        await proj1.init()
        var todo = repo1.getTasksInList(TODO)
        var doing = repo1.getTasksInList(DOING)
        console.log('TODO:',todo.map(({text, order}) => `${order} : ${text}`))
        console.log('DOING:',doing.map(({text, order}) => `${order} : ${text}`))
        var taskToMove = todo[1]
        console.log(`taskToMove: ${taskToMove.order} : ${taskToMove.text}`)
        // await repo1.moveTasks([taskToMove], DOING, 1)
        await repo1.moveTask({task: taskToMove, newList: DOING, newPos: 1})
        todo = repo1.getTasksInList(TODO)
        doing = repo1.getTasksInList(DOING)
        console.log('TODO:',todo.map(({text, order}) => `${order} : ${text}`))
        console.log('DOING:',doing.map(({text, order}) => `${order} : ${text}`))
        expect(taskToMove.equals(doing[1])).to.be.true
    })
    
    it('moveTasks Should move multiple tasks to the requested location in the requested list', async () => {
        const { project, repo } = await getFreshRepoAndProject({
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
        })
        await project.init()
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
        await repo.moveTasks(tasksToMove, DONE, 0)
        const fileTaskCountsResult = repo.getFiles().map(({path, tasks}) => {
            return {
                path,
                taskCount: tasks.length
            }
        })
        for (const {path, taskCount} of fileTaskCounts) {
            const fileTaskCount = fileTaskCountsResult.find(a => a.path === path);
            console.log(path);
            expect(taskCount).to.equal(fileTaskCount && fileTaskCount.taskCount);
        }
        expect(repo.getTasks().length).to.equal(allTasksLength)
        expect(repo.getTasksInList(DOING).length).to.equal(0)
        expect(repo.getTasksInList(DONE).length).to.equal(listLengthDONE + listLengthDOING)
        project.destroy()
    })

    it('Should move multiple tasks in a code file to the requested location in the requested list', async () => {
        const FILE_PATH = 'test.js'
        const { project, repo } = await getFreshRepoAndProject({
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
        })
        await project.init()
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
        await repo.moveTasks(tasksToMove, TODO, 0)
        const fileTaskCountsResult = repo.getFiles().map(({path, tasks}) => {
            return {
                path,
                taskCount: tasks.length
            }
        })
        fileTaskCounts.forEach(({path, taskCount}) => {
            const fileTaskCount = fileTaskCountsResult.find(a => a.path === path);
            console.log(path);
            expect(`${path}:${taskCount}`).to.equal(`${fileTaskCount.path}:${fileTaskCount.taskCount}`);
        })
        expect(repo.getTasks().length).to.equal(allTasksLength)
        const newTODOListLength = repo.getTasksInList(TODO).length
        const newDONEListLength = repo.getTasksInList(DONE).length
        expect(newTODOListLength).to.equal(listLengthTODO + 1)
        expect(newDONEListLength).to.equal(listLengthDONE - 1)
        project.destroy()
    })

    it('Extracts a task with inline order and switches to orderMeta when the task is moved', async () => {
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
        const {repo, project} = await createTmpProject({
            name: "order-integrity", 
            config: {
                keepEmptyPriority: true,
                settings: {
                    cards: {
                        orderMeta: true,
                        defaultList: TODO
                    }
                }
            },
            files: repoFiles
        })

        await project.init()
        let task = repo.getTasksInList(TODO).find(({meta}) => meta.task[0] === 'A')
        task = await repo.moveTask({ task, newList: DOING, newPos: 0 })
        expect(task.content).to.equal("Task A\ntask:A\n<!-- order:0 -->")
        project.destroy()
    })

    it.each([
        [[null, null, null, null], 2, 1, [10, 20, 30, null]]
    ])('moves a task in %j from position %j to position %j and updates order', async (tasks, fromPosition, toPosition, expected) => {
        const content = tasks.map((order, i) => {
            return `## #TODO:${order || ''} Task ${i}\ntask:${i}\n`
        }).join('\n')
        const files = [
            {
                name: `file.md`,
                content
            }
        ]
        const {project, repo} = await createTmpProject({
            name: 'order-integrity',
            files,
            config: {
                keepEmptyPriority: true,
                settings: {
                    cards: {
                        orderMeta: true,
                        defaultList: TODO
                    }
                }
              }
        })

        await project.init()
        const task = repo.getTasksInList(TODO).find(({meta}) => meta.task[0] === fromPosition + "")
        await repo.moveTask({ task, newList: TODO, newPos: toPosition })
        const expectedOrder = expected[toPosition]
        expect(task.content).to.equal(`Task ${fromPosition}\ntask:${fromPosition}\n<!-- order:${expectedOrder} -->`)
        project.destroy()
    })

    // Test modifying markdown tasks and order meta switch
    // We should be able to perform the following operations on a markdown task with no order
    // - [ ] move task
    // - [ ] move task after task with no order
    // - [ ] modify task 
    // - [ ] modify task from content
    // - [ ] modify task from html
    // - [ ] switch between orderMeta true/false
    it.each([
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
    ])('Moves a markdown task in a list with %j tasks with order from pos %j to pos %j, where pos %j - %j have same order, order is index * %j, orderMeta = %j, keepEmptyPriority = %j', 
        async (tasksWithOrder, fromPos, toPos, sameOrderFrom, sameOrderTo, orderMulti, orderMeta, keepEmptyPriority) => {
        
        let sameOrder
        const files = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, i) => {
            let order = i < tasksWithOrder ? i*orderMulti : ''
            if (i === sameOrderFrom) sameOrder = order
            if (i > sameOrderFrom && i <= sameOrderTo) order = sameOrder
            return {
                name: `file${letter}.md`,
                content: `## [Task ${letter}](#TODO:${order})\ntask:${letter}\n`
            }
        })

        const {repo, project} = await createTmpProject({
            name: 'tmp-repo-1',
            files,
            config:{
                keepEmptyPriority,
                settings: {
                    cards: {
                        orderMeta,
                        defaultList: TODO
                    }
                }
            }
        })

        await project.init()
        let todoTasks = repo.getTasksInList(TODO)
        let task = todoTasks[fromPos]
        const letter = task.meta.task[0]
        console.log(`task: ${letter}`)
        console.log(todoTasks.map(({order, meta}, i) => `index:${i}, letter:${meta.task[0]}, order:${order}`))
        const taskFilter =  ({meta}) => meta.task[0] === letter
        const newPos = toPos
        
        await repo.moveTask({task, newList: TODO, newPos})
        todoTasks = repo.getTasksInList(TODO)
        task = todoTasks.find(taskFilter)
        const newTaskIndex= todoTasks.findIndex(taskFilter)
        console.log(`task: ${letter}`)
        console.log(todoTasks.map(({order, meta}, i) => `index:${i}, letter:${meta.task[0]}, order:${order}`))
        expect(task.meta.task[0]).to.equal(letter)
        expect(newTaskIndex).to.equal(newPos)
        project.destroy()
    })

    it.each([
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
    ])('Same File - Move a markdown task with blank lines in a list with %j tasks with order from pos %j to pos %j, where pos %j - %j have same order, orderMeta = %j, keepEmptyPriority = %j', 
        async (tasksWithOrder, fromPos, toPos, sameOrderFrom, sameOrderTo, orderMeta, keepEmptyPriority) => {
        
        let sameOrder
        const content = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, i) => {
            let order = i < tasksWithOrder ? i*10 : ''
            if (i === sameOrderFrom) sameOrder = order
            if (i > sameOrderFrom && i <= sameOrderTo) order = sameOrder
            return `## [Task ${letter}](#TODO:${order})\n<card>\nSome content\n\nMore content\n\n<!--\ntask:${letter}\n-->\n</card>\n`
        }).join("\n")

        const files = [{
            name: "test-file.md",
            content
        }]
        
        const { project, repo } = await createTmpProject({
            name: 'tmp-repo-1',
            files,
            config: {
                keepEmptyPriority,
                settings: {
                    cards: {
                        orderMeta,
                        defaultList: TODO
                    }
                }
            }
        })

        await project.init()
        let todoTasks = repo.getTasksInList(TODO)
        const task = todoTasks[fromPos]
        const letter = task.meta.task[0]
        console.log(`task: ${letter}`)
        console.log(todoTasks.map(({order, meta}, i) => `${i} : ${meta.task[0]} : ${order}`))
        const taskFilter =  ({meta}) => meta.task[0] === letter 
        const newPos = toPos

        await repo.moveTask({task, newList: TODO, newPos})
        todoTasks = repo.getTasksInList(TODO)
        const newTaskIndex= todoTasks.findIndex(taskFilter)
        console.log(`task: ${letter}`)
        console.log(todoTasks.map(({order, meta}, i) => `${i} : ${meta.task[0]} : ${order}`))
        expect(newTaskIndex).toEqual(newPos)
        project.destroy()
    })

    it('Modify a markdown task with no order, orderMeta = true', async () => {
        const filePath =  'modify-tasks.md'
        const taskFilter = ({meta}) => meta.story && meta.story[0] === '4'
        const { project, repo } = await getFreshRepoAndProject({
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
        })
        await project.init()
        const file = repo.getFile(filePath)
        const task = file.getTasks().find(taskFilter)
        task.text = 'Story 4 edited'
        const newFile = await repo.modifyTask(task, true)
        expect(newFile.getTasks().find(taskFilter).text).to.equal('Story 4 edited')
    })

    it('Modify a markdown task with no order, orderMeta = false', async () => {
        const filePath =  'modify-tasks.md'
        const taskFilter = ({meta}) => meta.story && meta.story[0] === '4'
        const { project, repo } = await getFreshRepoAndProject({
            keepEmptyPriority: false,
            settings: {
                cards: {
                    orderMeta: true,
                    defaultList: TODO
                }
            }
        })
        await project.init()
        const file = repo.getFile(filePath)
        const task = file.getTasks().find(taskFilter)
        task.text = 'Story 4 edited'
        const newFile = await repo.modifyTask(task, true)
        expect(newFile.getTasks().find(taskFilter).text).to.equal('Story 4 edited')
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
