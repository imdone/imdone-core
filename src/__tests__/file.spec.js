import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sinon from 'sinon'
import { File } from  '../file'
import path from 'path'
import { Config } from '../config'
import languages from '../languages'
import eol from 'eol'
import fs from 'fs'
import wrench from 'wrench'
import { Task } from '../task'
import appContext from '../context/ApplicationContext'
import { ProjectContext } from '../ProjectContext'
import { FileProjectContext } from '../FileProjectContext'

const pluginManager = {
  onTaskUpdate: () => {},
  getCardProperties: () => { return {} },
  getBoardProperties: () => { return {} },
  getCardActions: () => [],
  loadInstalledPlugins: () => {},
  loadPluginsNotInstalled: () => {} 
}
appContext().projectContext = new FileProjectContext()

const generateTaskFromTemplate = (list, order, templateFunction) => {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  const lf = String(eol.lf)
  return templateFunction({
    date,
    list,
    order,
    year,
    month,
    day,
    hours,
    min,
    lf,
  })
}

const hashNoOrderTaskTemplate = ({
  date,
  list,
  order,
  year,
  month,
  day,
  hours,
  min,
  lf,
}) => {
  return `[${year}-${month}-${day} ${hours}:${min}] #${list}: Another task at ${order}${lf}<!-- created:${date.toISOString()} -->${lf}${lf}`
}

const hashTaskTemplate = ({
  date,
  list,
  order,
  year,
  month,
  day,
  hours,
  min,
  lf,
}) => {
  return `[${year}-${month}-${day} ${hours}:${min}] #${list}:${order} Another task at ${order}${lf}<!-- created:${date.toISOString()} -->${lf}${lf}`
}

const linkTaskTemplate = ({
  date,
  list,
  order,
  year,
  month,
  day,
  hours,
  min,
  lf,
}) => {
  return `[${year}-${month}-${day} ${hours}:${min}]  [Another task at ${order}](#${list}:${order})${lf}<!-- created:${date.toISOString()} -->${lf}${lf}`
}

const defaultProject = {
  renderMarkdown: () => 'File content',
  extractWikilinkTopics: () => [],
}

describe('File', function () {
  const tmpDir = path.join(process.cwd(), 'tmp', 'files')
  const testFilesDir = path.join(process.cwd(), 'test', 'files')
  beforeEach(() => {
    if (fs.existsSync(tmpDir)) {
      wrench.rmdirSyncRecursive(tmpDir)
    }
    wrench.mkdirSyncRecursive(tmpDir)
    wrench.copyDirSyncRecursive(testFilesDir, tmpDir, { forceDelete: true })
  })

  afterEach(() => {
    wrench.rmdirSyncRecursive(tmpDir)
  })

  it.skip('should enable subclassing', function () {
    function SomeFile() {
      File.apply(this, arguments)
    }

    var ok
    var config = Config.newDefaultConfig()
    util.inherits(SomeFile, File)

    SomeFile.prototype.extractTasks = function (config) {
      ok = true
      return SomeFile.super_.prototype.extractTasks.call(this, config)
    }
    const filePath = path.join('tmp', 'files', 'sample.js')
    const content = fs.readFileSync('tmp/files/sample.js', 'utf8')
    const project = { path: '/', config , ...defaultProject }
    var someFile = new SomeFile({
      repoId: 'test',
      filePath,
      content,
      languages: languages,
      project,
    })

    expect(someFile instanceof File).to.be.true
    expect(someFile instanceof SomeFile).to.be.true
    expect(someFile.getType()).to.be('SomeFile')

    expect(someFile.extractTasks(config).tasks.length).to.equal(8)
    expect(ok).to.be.true
  })

  describe('getLinePos', function () {
    it('should give the correct line position for each line of a file', function () {
      var content = fs.readFileSync('tmp/files/test.js', 'utf8')
      const project = { path: 'tmp/files', ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/test.js',
        content: content,
        languages: languages,
        project,
      })

      expect(file.getLinePos(1)).to.equal(0)
      expect(file.getLinePos(2)).to.equal(30)
      expect(file.getLinePos(3)).to.equal(51)
      expect(file.getLinePos(4)).to.equal(75)
      expect(file.getLinePos(5)).to.equal(106)
      expect(file.getLinePos(6)).to.equal(109)
      expect(file.getLinePos(7)).to.equal(156)
      expect(file.getLinePos(8)).to.equal(176)
      expect(file.getLinePos(9)).to.equal(181)
      expect(file.getLinePos(10)).to.equal(194)
      expect(file.getLinePos(11)).to.equal(239)
    })
  })

  describe('deleteTask', () => {
    it('should delete a checkbox task with blank lines', () => {
      const filePath = 'tmp/files/checkbox-deletions.md'
      const after = `
- [ ] [A new card with space](#TODO:-10)
  <card>
    
    space
    
    <!--
    created:2022-03-23T18:49:36.583Z
    -->
  </card>`
        .split(eol.lf)
        .join(eol.auto)

      var config = Config.newDefaultConfig()
      config.settings = {
        doneList: 'DONE',
        cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
      }
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractAndTransformTasks(config)
      expect(file.getTasks().length).to.equal(2)
      expect(file.content).to.equal(content)
      file.deleteTask(file.tasks[0], config)
      expect(file.content).to.equal(after)
    })
  })

  describe('extractAndTransformTasks', () => {
    it('should add order to the correct location based on settings.orderMeta', () => {
      const filePath = 'tmp/files/BIG-FILE-DOES-NOT-EXIST.md'
      const lists = {
        TODO: 20,
        DOING: 10,
        DONE: 600,
        PÅGÅENDE: 20,
      }

      let content = ''
      Object.keys(lists).forEach((list) => {
        for (let n = 0; n < lists[list]; n++) {
          content += generateTaskFromTemplate(list, n, hashNoOrderTaskTemplate)
        }
      })
      var config = Config.newDefaultConfig()
      config.settings = {
        doneList: 'DONE',
        cards: {
          metaNewLine: true,
          addCompletedMeta: true,
          doneList: 'DONE',
          orderMeta: true,
        },
      }
      appContext().projectContext =
        new ProjectContext({
          config,
          listExists: () => true,
          getTasksInList: () => [],
        })
      
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      file.extractAndTransformTasks(config)

      expect(file.content).to.not.equal(content)
    })

    it('should update metadata', () => {
      var config = Config.newDefaultConfig()
      config.settings = {
        doneList: 'DONE',
        cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
      }
      appContext().projectContext =
        new ProjectContext({
          config,
          listExists: () => true,
          getTasksInList: () => [],
        })
      
      var content = fs.readFileSync('tmp/files/update-metadata.md', 'utf8')
      const project = { config, path: 'tmp/files', pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/update-metadata.md',
        content: content,
        languages: languages,
        project,
      })
      file.extractAndTransformTasks(config)
      expect(file.content).to.not.equal(content)
    })

    it('should complete tasks with checkbox beforeText in a md file', () => {
      var config = Config.newDefaultConfig()
      // BACKLOG Test with changes to config
      // <!--
      // order:-1015
      // -->
      config.settings = {
        doneList: 'DONE',
        cards: {
          addCompletedMeta: true,
          metaNewLine: true,
          trackChanges: true,
        },
      }
      const filePath = 'tmp/files/update-metadata.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { config, path: 'tmp/files', pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })
      file.extractTasks(config)
      file.transformTasks(config, true)
      const lines = eol.split(file.content)
      expect(lines[14].startsWith('- [x]')).to.be.true
      expect(lines[19].startsWith('- [x]')).to.be.true
      expect(lines[24].startsWith('- [x]')).to.be.true
    })

    it('should uncomplete tasks with checkbox beforeText in a md file', () => {
      var config = Config.newDefaultConfig()
      // BACKLOG Test with changes to config
      // <!--
      // order:-1025
      // -->
      config.settings = {
        doneList: 'DONE',
        cards: {
          addCompletedMeta: true,
          metaNewLine: true,
          trackChanges: true,
        },
      }
      const filePath = 'tmp/files/update-metadata.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { config, path: 'tmp/files', pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })
      file.extractTasks(config)
      file.transformTasks(config, true)
      const lines = eol.split(file.content)
      expect(lines[29].startsWith('- [ ]')).to.be.true
      expect(lines[33].startsWith('- [ ]')).to.be.true
      expect(lines[37].startsWith('- [ ]')).to.be.true
    })

    it(`should find checkbox tasks`, () => {
      var config = Config.newDefaultConfig()
      // BACKLOG Test with changes to config
      // <!--
      // order:-1035
      // -->
      config.settings = {
        newCardSyntax: 'MARKDOWN',
        orderMeta: true,
        cards: {
          doneList: 'DONE',
          defaultList: 'TODO',
          addCheckBoxTasks: true,
          metaNewLine: true,
          trackChanges: true,
        },
      }
      const filePath = 'tmp/files/checkbox-tasks.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })
      file.extractAndTransformTasks(config)
      const lines = eol.split(file.content)
      expect(file.isModified()).to.be.true
      expect(
        lines[0].startsWith('- [ ] [A checkbox task without a list](#TODO:')
      ).to.be.true
      expect(lines[10].startsWith('- [ ] [A new checkbox task](#TODO:')).to.be.true
      expect(lines[11].startsWith('  - [ ] Another checkbox subtask')).to.be.true
      expect(lines[16].startsWith('- [ ] [Task 1-a](#TODO:')).to.be.true
      expect(lines[17].startsWith('  - [ ] Subtask 1-a-a')).to.be.true
      expect(lines[18].startsWith('  - [ ] Subtask 1-a-b')).to.be.true
      expect(lines[22].startsWith('- [ ] [Task 1-b](#TODO:')).to.be.true
      expect(lines[23].startsWith('  - [ ] Subtask 1-b-a')).to.be.true
      expect(lines[24].startsWith('  - [ ] Subtask 1-b-b')).to.be.true
      // expect(lines[30].startsWith('  - [ ] [A task in a list](#TODO:')).to.be(
      //   true
      // )
    })
  })

  describe('extractTasks', function () {
    it('Should find markdown tasks in a markdown file', function () {
      var config = Config.newDefaultConfig()
      var content = fs.readFileSync('tmp/files/sample.md', 'utf8')
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content: content,
        languages: languages,
        project,
      })

      var expectation = sinon.mock()
      file.on('task.found', expectation)
      expectation.exactly(8)
      expect(file.extractTasks(config).getTasks().length).to.equal(8)
      expect(file.tasks[2].description.length).to.equal(2)
      expectation.verify()
    })

    it('Should ignore tasks in code blocks', function () {
      var content = fs.readFileSync('tmp/files/code-blocks.md', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/code-blocks.md',
        content: content,
        languages: languages,
        project,
      })
      const tasks = file.extractTasks(config).getTasks()
      expect(tasks.length).to.equal(1)
      expect(tasks[0].content).to.equal("This is a card\n\n[A link with a #tag](https://imdone.io/#tag)\n\n`#TODO A codeblock with a #tag`\n\n```javascript\nconsole.log('A codeblock with a #tag')\n// DOING this is a task\n```\n\n```markdown\n#DOING A card\n```")
    })

    it('Should not include content in brackets before a task', function () {
      const config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      let content = '[2021-12-01 12:00] #DOING:20 A new task'
      let file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content,
        languages,
        project,
      })
      let tasks = file.extractTasks(config).getTasks()
      let task = tasks.find((task) => task.order === 20)
      expect(task.text).to.equal('A new task')

      content = '[2021-12-01 12:00] [A new task](#DOING:20)'
      file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample2.md',
        content,
        languages,
        project,
      })
      tasks = file.extractTasks(config).getTasks()
      task = tasks.find((task) => task.order === 20)
      expect(task.text).to.equal('A new task')
    })

    it('Should find all tasks in a code file', function () {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })

      var expectation = sinon.mock()
      file.on('task.found', expectation)
      expectation.exactly(8)
      expect(file.extractTasks(config).getTasks().length).to.equal(8)
      expectation.verify()
    })

    it('Should find all HASHTAG tasks in a markdown file', function () {
      const filePath = 'tmp/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      const expectation = sinon.mock()
      file.on('task.found', expectation)
      expectation.exactly(3)
      file.extractTasks(config)
      expect(file.getTasks()
        .filter((task) => task.getType() === Task.Types.HASHTAG)
        .length).to.equal(3)
      expectation.verify()
    })

    it('Should find all HASH_NO_ORDER tasks in a large markdown file', function () {
      const filePath = 'tmp/files/BIG-FILE-DOES-NOT-EXIST.md'
      const lists = {
        TODO: 20,
        DOING: 10,
        DONE: 600,
        PÅGÅENDE: 20,
      }

      let content = ''
      Object.keys(lists).forEach((list) => {
        for (let n = 0; n < lists[list]; n++) {
          content += generateTaskFromTemplate(list, n, hashNoOrderTaskTemplate)
        }
      })
      var config = Config.newDefaultConfig()
      config.lists.unshift({ name: 'PÅGÅENDE' })
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      const tasks = file.extractTasks(config).getTasks()
      expect(tasks.length).to.equal(650)
    })

    it('Should find all HASH tasks in a large markdown file', function () {
      const filePath = 'tmp/files/BIG-FILE-DOES-NOT-EXIST.md'
      const lists = {
        TODO: 20,
        DOING: 10,
        DONE: 600,
        PÅGÅENDE: 20,
      }

      let content = ''
      Object.keys(lists).forEach((list) => {
        for (let n = 0; n < lists[list]; n++) {
          content += generateTaskFromTemplate(list, n, hashTaskTemplate)
        }
      })
      var config = Config.newDefaultConfig()
      config.lists.push({ name: 'PÅGÅENDE' })
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      expect(file.extractTasks(config).getTasks().length).to.equal(650)
    })

    it('Should find all LINK tasks in a large markdown file', function () {
      const filePath = 'tmp/files/BIG-FILE-DOES-NOT-EXIST.md'
      const lists = {
        TODO: 20,
        DOING: 10,
        DONE: 600,
        PÅGÅENDE: 20,
      }

      let content = ''
      Object.keys(lists).forEach((list) => {
        for (let n = 0; n < lists[list]; n++) {
          content += generateTaskFromTemplate(list, n, linkTaskTemplate)
        }
      })
      var config = Config.newDefaultConfig()
      config.lists.push({ name: 'PÅGÅENDE' })
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      expect(file.extractTasks(config).getTasks().length).to.equal(650)
    })
  })

  describe('modifyTaskFromContent', function () {
    it('Should modfy a description from content', function () {
      var config = Config.newDefaultConfig()
      var content = fs.readFileSync('tmp/files/sample.md', 'utf8')
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content: content,
        languages: languages,
        project,
      })
      expect(file.extractTasks(config).getTasks().length).to.equal(8)
      expect(file.tasks[2].description.length).to.equal(2)
      file.modifyTaskFromContent(
        file.tasks[2],
        'task 1 +okay -->\n- A description line\n- [ ] a sub task\none more',
        config
      )
      expect(file.tasks[2].description.length).to.equal(3)
    })

    it('modifies a task that contains <code> tags', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'DOING')
      expect(task.description.length).to.equal(16)
      file.modifyTaskFromContent(
        task,
        'This is \n  \n A multiline \n     \n comment',
        config
      )
      expect(task.isWrappedWithCardTag).to.be.true
      expect(task.description.length).to.equal(4)
    })

    it('replaces content in  a task without blank lines with content containing blank lines', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'TODO')
      expect(task.description.length).to.equal(2)
      file.modifyTaskFromContent(
        task,
        'This is \n  \n A multiline \n     \n comment',
        config
      )
      expect(task.description.length).to.equal(4)
    })
  })

  describe('modifyTaskFromHtml', () => {
    it('should modify a task that contains <code> tags', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'DOING')
      expect(task.description.length).to.equal(16)
      file.modifyTaskFromHtml(
        task,
        '<div class="task-description"><input type="checkbox" checked></input>',
        config
      )
      const modifiedFile = new File({
        repoId: 'test',
        filePath,
        content: file.content,
        languages: languages,
        project,
      })
      modifiedFile.extractTasks(config)
      const modifiedTask = modifiedFile.tasks.find(
        (task) => task.list === 'DOING'
      )
      expect(modifiedTask.getProgress().completed).to.equal(1)
    })
  })

  describe('modifyTask', () => {
    it('should modify a HASH_NO_ORDER task that has no order metadata', () => {
      const filePath = 'tmp/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      config.settings.cards = {
        orderMeta: true,
      }
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'DONE')
      task.order = 100
      file.modifyTask(task, config, true)
      expect(task.meta.order[0]).to.equal(100)
      expect(task.meta.order.length).to.equal(1)
    })

    it('should modify a HASH_NO_ORDER task that has order metadata', () => {
      const filePath = 'tmp/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      config.settings.cards = {
        orderMeta: true,
      }
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'TODO')
      task.order = 100
      file.modifyTask(task, config, true)
      expect(task.meta.order[0]).to.equal(100)
      expect(task.meta.order.length).to.equal(1)
    })

    it('should modify a MARKDOWN task that has order in the task text', () => {
      const filePath = 'tmp/files/modify-tasks.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      config.settings.cards = {
        orderMeta: true,
      }
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'TODO')
      task.order = 100
      file.modifyTask(task, config, true)
      expect(task.meta.order[0]).to.equal(100)
      expect(task.meta.order.length).to.equal(1)
    })
  })

  describe('getCodeCommentRegex', function () {
    it('Should return the regex for a given file type', function () {
      const project = { path: 'tmp/files' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: fs.readFileSync('tmp/files/sample.js', 'utf8'),
        languages: languages,
        project,
      })
      const myRe = file.getCodeCommentRegex()
      console.log(myRe)
      const str = file.getContent()
      var myArray
      while ((myArray = myRe.exec(str)) !== null) {
        console.log(
          'Found %s at %d.  Next match starts at %d',
          myArray[0],
          myArray.index,
          myRe.lastIndex
        )
      }
    })
  })

  describe('extractTasksInCodeFile', function () {
    it('Should extract code style tasks from a code file', function () {
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: fs.readFileSync('tmp/files/sample.js', 'utf8'),
        languages: languages,
        project,
      })
      file.extractTasksInCodeFile(Config.newDefaultConfig())
      expect(file.tasks.length).to.equal(8)
    })
  })

  describe('trimCommentBlockStart', () => {
    it('should trim the code block start pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      expect(file.trimCommentBlockStart('/* This is a comment')
      ).to.equal('This is a comment')

      expect(file.trimCommentBlockStart('/*This is a comment')
      ).to.equal('This is a comment')

      expect(file.trimCommentBlockStart(' /*This is a comment')
      ).to.equal('This is a comment')

      expect(file.trimCommentBlockStart('  /* This is a comment')
      ).to.equal('This is a comment')

      expect(file.trimCommentBlockStart('   /* This is a comment')
      ).to.equal('This is a comment')

      expect(file.trimCommentBlockStart('   /*  This is a comment')
      ).to.equal(' This is a comment')
    })
  })

  describe('trimCommentBlockIgnore', () => {
    it('should trim the code block ignore pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      expect(file
        .trimCommentBlockIgnore('* This is a comment')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentBlockIgnore('*This is a comment')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentBlockIgnore(' *This is a comment')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentBlockIgnore('  * This is a comment')
      ).to.equal('This is a comment')
    })
  })

  describe('trimCommentBlockEnd', () => {
    it('should trim the code block end pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      expect(file
        .trimCommentBlockEnd('This is a comment */')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentBlockEnd('This is a comment*/')
      ).to.equal('This is a comment')
      expect(file.trimCommentBlockEnd('*/')).to.equal('')
      expect(file.trimCommentBlockEnd('*/ ')).to.equal('')
      expect(file.trimCommentBlockEnd(' */ ')).to.equal('')
      expect(file.trimCommentBlockEnd(' */  ')).to.equal('')
    })
  })

  describe('trimCommentStart', () => {
    it('should trim the comment start from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      expect(file
        .trimCommentStart('//This is a comment')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentStart(' // This is a comment')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentStart('  // This is a comment')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentStart('  //  This is a comment')
      ).to.equal(' This is a comment')
    })
  })

  describe('trimCommentChars', () => {
    it('should trim the code block end pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      expect(file
        .trimCommentChars('This is a comment */')
      ).to.equal('This is a comment')
      expect(file
        .trimCommentChars('This is a comment*/')
      ).to.equal('This is a comment')
      expect(file.trimCommentChars('*/')).to.equal('')
      expect(file.trimCommentChars('*/ ')).to.equal('')
      expect(file.trimCommentChars(' */ ')).to.equal('')
      expect(file.trimCommentChars(' */  ')).to.equal('')
    })
  })
  describe('hasTaskInText', () => {
    it('returns truthy if a line has a task', () => {
      const filePath = path.join('test', 'files', 'sample.js')
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.hasTaskInText(config, 'TODO: a task')).to.be.true
      expect(file.hasTaskInText(config, '[a task](#TODO:0)')).to.be.true
      expect(file.hasTaskInText(config, 'well a task')).to.be.false
      expect(file.hasTaskInText(config, '#TODO: a task')).be.true
    })
  })
  describe('extractTasks', () => {
    it('extracts tasks and descriptions', () => {
      var content = fs.readFileSync('tmp/files/descriptions.js', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/descriptions.js',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.tasks[0].description.length).to.equal(2)
      expect(file.tasks[0].line).to.equal(2)
      expect(file.tasks[1].description.length).to.equal(1)
      expect(file.tasks[1].line).to.equal(5)
      expect(file.tasks[2].description.length).to.equal(2)
      expect(file.tasks[2].line).to.equal(10)
      expect(file.tasks[3].description.length).to.equal(1)
      expect(file.tasks[3].line).to.equal(13)
      expect(file.tasks[4].description.length).to.equal(1)
      expect(file.tasks[4].line).to.equal(14)
    })

    it('sets the correct beforeText for hash and link style tasks', () => {
      var content = fs.readFileSync('tmp/files/sample.md', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.tasks
        .find((task) => task.text === 'Find tasks in markdown comments')
        .beforeText).to.equal('# ')
      expect(file.tasks
        .find(
          (task) =>
            task.text ===
            'Create Placeholder for adding new cards with [space].'
        )
        .beforeText).to.equal('## ')
    })

    it('extracts tasks in a c sharp file', () => {
      var content = fs.readFileSync(
        'test/repos/repo3/KillSurvivorCommandHandler.cs',
        'utf8'
      )
      var config = Config.newDefaultConfig()
      const project = { path: 'test/repos/repo3', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'test/repos/repo3/KillSurvivorCommandHandler.cs',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.tasks.length).to.equal(2)
    })

    it('extracts tasks in markdown lists', () => {
      const filePath = 'test/repos/repo3/lists.md'
      var config = Config.newDefaultConfig()
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'test/repos/repo3', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.tasks[0].description.length).to.equal(2)
      expect(file.tasks[0].line).to.equal(1)
      expect(file.tasks[1].description.length).to.equal(1)
      expect(file.tasks[1].line).to.equal(5)
    })

    it('extracts tasks with blank lines preserved', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.tasks
        .find((task) => task.list === 'DOING')
        .description.length).to.equal(16)
    })
    
    it('should ignore tasks in markdown code blocks or code spans', () => {
      const filePath = 'tmp/files/code-blocks.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config, pluginManager , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      expect(file.tasks.length).to.equal(1)
    })
    
    it('should ignore tasks in files with kanban-plugin frontMatter', () => {
      var content = `---
kanban-plugin: true
---

- [A task](#TODO:)
`
      const project = { path: 'test' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'test.md',
        content: content,
        languages: languages,
        project,
      })
      var config = Config.newDefaultConfig()
      file.extractTasks(config)
      expect(file.tasks.length).to.equal(0)
    })

    it('should ignore tasks in files with imdone_ignore frontMatter', () => {
      var content = `---
imdone_ignore: true
---

- [A task](#TODO:)
`
      const project = { path: 'test' , ...defaultProject }
      var file = new File({
        repoId: 'test',
        filePath: 'test.md',
        content: content,
        languages: languages,
        project,
      })
      var config = Config.newDefaultConfig()
      file.extractTasks(config)
      expect(file.tasks.length).to.equal(0)
    })
  })
})

describe('parseDate', () => {
  const config = {
    getMetaSep: () => ':',
  }
  it('should parse a due date from a task', () => {
    const dueDate = File.parseDate(config, ' due in two days.', 'due')
    expect(dueDate.startsWith(' due:')).to.be.true
  })

  it('should return the text if it\'s not a due date', () => {
    const dueDate = File.parseDate(config, ' a due task.', 'due')
    expect(dueDate).to.equal(' a due task.')
  })

  it('should parse a defer date from a task', () => {
    const dueDate = File.parseDate(config, ' defer for 2 days.', 'defer')
    expect(dueDate.startsWith(' defer:')).to.be.true
  })

  it('should parse a defer-date from a task', () => {
    const dueDate = File.parseDeferDate(config, ' defer for 2 days.')
    expect(dueDate.startsWith(' defer:')).to.be.true
  })
})
