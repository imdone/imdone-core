var should = require('should'),
  expect = require('expect.js'),
  sinon = require('sinon'),
  File = require('../lib/file'),
  path = require('path'),
  Config = require('../lib/config'),
  util = require('util'),
  languages = require('../lib/languages'),
  eol = require('eol'),
  fs = require('fs')
const wrench = require('wrench')
const Task = require('../lib/task')
const appContext = require('../lib/context/ApplicationContext')
const ProjectContext = require('../lib/ProjectContext')
const FileProjectContext = require('../lib/domain/entities/FileProjectContext')
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

describe('File', function () {
  const tmpDir = path.join(process.cwd(), 'tmp', 'files')
  const testFilesDir = path.join(process.cwd(), 'test', 'files')
  beforeEach((done) => {
    try {
      if (fs.existsSync(tmpDir)) {
        wrench.rmdirSyncRecursive(tmpDir)
      }
      wrench.mkdirSyncRecursive(tmpDir)
      wrench.copyDirSyncRecursive(testFilesDir, tmpDir, { forceDelete: true })
      done()
    } catch (e) {
      return done(e)
    }
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
    const project = { path: '/', config }
    var someFile = new SomeFile({
      repoId: 'test',
      filePath,
      content,
      languages: languages,
      project,
    })

    expect(someFile instanceof File).to.be(true)
    expect(someFile instanceof SomeFile).to.be(true)
    expect(someFile.getType()).to.be('SomeFile')

    someFile.extractTasks(config).tasks.length.should.be.exactly(8)
    expect(ok).to.be(true)
  })

  describe('getLinePos', function () {
    it('should give the correct line position for each line of a file', function () {
      var content = fs.readFileSync('tmp/files/test.js', 'utf8')
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/test.js',
        content: content,
        languages: languages,
        project,
      })

      file.getLinePos(1).should.equal(0)
      file.getLinePos(2).should.equal(30)
      file.getLinePos(3).should.equal(51)
      file.getLinePos(4).should.equal(75)
      file.getLinePos(5).should.equal(106)
      file.getLinePos(6).should.equal(109)
      file.getLinePos(7).should.equal(156)
      file.getLinePos(8).should.equal(176)
      file.getLinePos(9).should.equal(181)
      file.getLinePos(10).should.equal(194)
      file.getLinePos(11).should.equal(239)
    })
  })

  describe('deleteTask', () => {
    it('should delete a checkbox task with blank lines', () => {
      const filePath = 'tmp/files/checkbox-deletions.md'
      after = `
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
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractAndTransformTasks(config)
      file.getTasks().length.should.equal(2)
      file.content.should.equal(content)
      file.deleteTask(file.tasks[0], config)
      file.content.should.equal(after)
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
      
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      file.extractAndTransformTasks(config)

      file.content.should.not.equal(content)
    })

    it('should update metadata', () => {
      var config = Config.newDefaultConfig()
      config.settings = {
        doneList: 'DONE',
        cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
      }
      appContext().projectContext,
        new ProjectContext({
          config,
          listExists: () => true,
          getTasksInList: () => [],
        })
      
      var content = fs.readFileSync('tmp/files/update-metadata.md', 'utf8')
      const project = { config, path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/update-metadata.md',
        content: content,
        languages: languages,
        project,
      })
      file.extractAndTransformTasks(config)
      file.content.should.not.equal(content)
    })

    it('should complete tasks with checkbox beforeText in a md file', () => {
      var config = Config.newDefaultConfig()
      // BACKLOG:-50 Test with changes to config
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
      const project = { config, path: 'tmp/files' }
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
      expect(lines[14].startsWith('- [x]')).to.be(true)
      expect(lines[19].startsWith('- [x]')).to.be(true)
      expect(lines[24].startsWith('- [x]')).to.be(true)
    })

    it('should uncomplete tasks with checkbox beforeText in a md file', () => {
      var config = Config.newDefaultConfig()
      // BACKLOG:-60 Test with changes to config
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
      const project = { config, path: 'tmp/files' }
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
      expect(lines[29].startsWith('- [ ]')).to.be(true)
      expect(lines[33].startsWith('- [ ]')).to.be(true)
      expect(lines[37].startsWith('- [ ]')).to.be(true)
    })

    it(`should find checkbox tasks`, () => {
      var config = Config.newDefaultConfig()
      // BACKLOG:-70 Test with changes to config
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
      const filePath = 'tmp/files/checkbox-tasks.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })
      file.extractAndTransformTasks(config)
      const lines = eol.split(file.content)
      file.isModified().should.be.true()
      expect(
        lines[0].startsWith('- [ ] [A checkbox task without a list](#TODO:')
      ).to.be(true)
      expect(lines[10].startsWith('- [ ] [A new checkbox task](#TODO:')).to.be(
        true
      )
      expect(lines[11].startsWith('  - [ ] Another checkbox subtask')).to.be(
        true
      )
      expect(lines[16].startsWith('- [ ] [Task 1-a](#TODO:')).to.be(true)
      expect(lines[17].startsWith('  - [ ] Subtask 1-a-a')).to.be(true)
      expect(lines[18].startsWith('  - [ ] Subtask 1-a-b')).to.be(true)
      expect(lines[22].startsWith('- [ ] [Task 1-b](#TODO:')).to.be(true)
      expect(lines[23].startsWith('  - [ ] Subtask 1-b-a')).to.be(true)
      expect(lines[24].startsWith('  - [ ] Subtask 1-b-b')).to.be(true)
      expect(lines[30].startsWith('  - [ ] [A task in a list](#TODO:')).to.be(
        true
      )
    })
  })

  describe('extractTasks', function () {
    it('Should find markdown tasks in a markdown file', function () {
      var config = Config.newDefaultConfig()
      var content = fs.readFileSync('tmp/files/sample.md', 'utf8')
      const project = { path: 'tmp/files', config }
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
      file.extractTasks(config).getTasks().length.should.be.exactly(8)
      file.tasks[2].description.length.should.be.exactly(2)
      expectation.verify()
    })

    it('Should not include content in brackets before a task', function () {
      content = '[2021-12-01 12:00] #DOING:20 A new task'
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content,
        languages,
        project,
      })
      let tasks = file.extractTasks(config).getTasks()
      let task = tasks.find((task) => task.order === 20)
      task.text.should.equal('A new task')

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
      task.text.should.equal('A new task')
    })

    it('Should find all tasks in a code file', function () {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
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
      file.extractTasks(config).getTasks().length.should.be.exactly(8)
      expectation.verify()
    })

    it('Should find all HASHTAG tasks in a markdown file', function () {
      const filePath = 'tmp/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
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
      file.getTasks()
        .filter((task) => task.getType() === Task.Types.HASHTAG)
        .length.should.be.exactly(3)
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
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      const tasks = file.extractTasks(config).getTasks()
      tasks.length.should.be.exactly(650)
    })

    it.skip('Should find all HASH tasks in a large markdown file', function () {
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
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      file.extractTasks(config).getTasks().length.should.be.exactly(650)
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
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      file.extractTasks(config).getTasks().length.should.be.exactly(650)
    })
  })

  describe('modifyTaskFromContent', function () {
    it('Should modfy a description from content', function () {
      var config = Config.newDefaultConfig()
      var content = fs.readFileSync('tmp/files/sample.md', 'utf8')
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config).getTasks().length.should.be.exactly(8)
      file.tasks[2].description.length.should.be.exactly(2)
      file.modifyTaskFromContent(
        file.tasks[2],
        'task 1 +okay -->\n- A description line\n- [ ] a sub task\none more',
        config
      )
      file.tasks[2].description.length.should.be.exactly(3)
    })

    it('modifies a task that contains <code> tags', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'DOING')
      task.description.length.should.be.exactly(16)
      file.modifyTaskFromContent(
        task,
        'This is \n  \n A multiline \n     \n comment',
        config
      )
      task.isWrappedWithCardTag.should.be.ok()
      task.description.length.should.be.exactly(4)
    })

    it('replaces content in  a task without blank lines with content containing blank lines', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'TODO')
      task.description.length.should.be.exactly(2)
      file.modifyTaskFromContent(
        task,
        'This is \n  \n A multiline \n     \n comment',
        config
      )
      task.isWrappedWithCardTag.should.be.ok()
      task.description.length.should.be.exactly(4)
    })
  })

  describe('modifyTaskFromHtml', () => {
    it('should modify a task that contains <code> tags', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      const task = file.tasks.find((task) => task.list === 'DOING')
      task.description.length.should.be.exactly(16)
      file.modifyTaskFromHtml(
        task,
        '<div class="task-description"><input type="checkbox" checked><input>',
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
      modifiedTask.getProgress().completed.should.be.exactly(1)
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
      const project = { path: 'tmp/files', config }
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
      task.meta.order[0].should.equal(100)
      task.meta.order.length.should.be.exactly(1)
    })

    it('should modify a HASH_NO_ORDER task that has order metadata', () => {
      const filePath = 'tmp/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      config.settings.cards = {
        orderMeta: true,
      }
      const project = { path: 'tmp/files', config }
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
      task.meta.order[0].should.equal(100)
      task.meta.order.length.should.be.exactly(1)
    })

    it('should modify a MARKDOWN task that has order in the task text', () => {
      const filePath = 'tmp/files/modify-tasks.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      config.settings.cards = {
        orderMeta: true,
      }
      const project = { path: 'tmp/files', config }
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
      task.meta.order[0].should.equal(100)
      task.meta.order.length.should.be.exactly(1)
    })
  })

  describe('getCodeCommentRegex', function () {
    it('Should return the regex for a given file type', function () {
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: fs.readFileSync('tmp/files/sample.js', 'utf8'),
        languages: languages,
        project,
      })
      myRe = file.getCodeCommentRegex()
      console.log(myRe)
      str = file.getContent()
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
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: fs.readFileSync('tmp/files/sample.js', 'utf8'),
        languages: languages,
        project,
      })
      file.extractTasksInCodeFile(Config.newDefaultConfig())
      // console.log(file.tasks)
    })
  })

  describe('trimCommentBlockStart', () => {
    it('should trim the code block start pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      file
        .trimCommentBlockStart('/* This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockStart('/*This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockStart(' /*This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockStart('  /* This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockStart('   /* This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockStart('   /*  This is a comment')
        .should.equal(' This is a comment')
    })
  })

  describe('trimCommentBlockIgnore', () => {
    it('should trim the code block ignore pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      file
        .trimCommentBlockIgnore('* This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockIgnore('*This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockIgnore(' *This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentBlockIgnore('  * This is a comment')
        .should.equal('This is a comment')
    })
  })

  describe('trimCommentBlockEnd', () => {
    it('should trim the code block end pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      file
        .trimCommentBlockEnd('This is a comment */')
        .should.equal('This is a comment')
      file
        .trimCommentBlockEnd('This is a comment*/')
        .should.equal('This is a comment')
      file.trimCommentBlockEnd('*/').should.equal('')
      file.trimCommentBlockEnd('*/ ').should.equal('')
      file.trimCommentBlockEnd(' */ ').should.equal('')
      file.trimCommentBlockEnd(' */  ').should.equal('')
    })
  })

  describe('trimCommentStart', () => {
    it('should trim the comment start from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      file
        .trimCommentStart('//This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentStart(' // This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentStart('  // This is a comment')
        .should.equal('This is a comment')
      file
        .trimCommentStart('  //  This is a comment')
        .should.equal(' This is a comment')
    })
  })

  describe('trimCommentChars', () => {
    it('should trim the code block end pattern from a line of text', () => {
      var content = fs.readFileSync('tmp/files/sample.js', 'utf8')
      const project = { path: 'tmp/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.js',
        content: content,
        languages: languages,
        project,
      })
      file
        .trimCommentChars('This is a comment */')
        .should.equal('This is a comment')
      file
        .trimCommentChars('This is a comment*/')
        .should.equal('This is a comment')
      file.trimCommentChars('*/').should.equal('')
      file.trimCommentChars('*/ ').should.equal('')
      file.trimCommentChars(' */ ').should.equal('')
      file.trimCommentChars(' */  ').should.equal('')
    })
  })
  describe('hasTaskInText', () => {
    it('returns truthy if a line has a task', () => {
      const filePath = path.join('test', 'files', 'sample.js')
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      should(file.hasTaskInText(config, 'TODO: a task')).be.ok()
      should(file.hasTaskInText(config, '[a task](#TODO:0)')).be.ok()
      should(file.hasTaskInText(config, 'well a task')).not.be.ok()
      should(file.hasTaskInText(config, '#TODO: a task')).be.ok()
    })
  })
  describe('extractTasks', () => {
    it('extracts tasks and descriptions', () => {
      var content = fs.readFileSync('tmp/files/descriptions.js', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/descriptions.js',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      file.tasks[0].description.length.should.be.exactly(2)
      file.tasks[0].line.should.be.exactly(2)
      file.tasks[1].description.length.should.be.exactly(1)
      file.tasks[1].line.should.be.exactly(5)
      file.tasks[2].description.length.should.be.exactly(2)
      file.tasks[2].line.should.be.exactly(10)
      file.tasks[3].description.length.should.be.exactly(1)
      file.tasks[3].line.should.be.exactly(13)
      file.tasks[4].description.length.should.be.exactly(1)
      file.tasks[4].line.should.be.exactly(14)
    })

    it('sets the correct beforeText for hash and link style tasks', () => {
      var content = fs.readFileSync('tmp/files/sample.md', 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'tmp/files/sample.md',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      file.tasks
        .find((task) => task.text === 'Find tasks in markdown comments')
        .beforeText.should.equal('# ')
      file.tasks
        .find(
          (task) =>
            task.text ===
            'Create Placeholder for adding new cards with [space].'
        )
        .beforeText.should.equal('## ')
    })

    it('extracts tasks in a c sharp file', () => {
      var content = fs.readFileSync(
        'test/repos/repo3/KillSurvivorCommandHandler.cs',
        'utf8'
      )
      var config = Config.newDefaultConfig()
      const project = { path: 'test/repos/repo3', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/repos/repo3/KillSurvivorCommandHandler.cs',
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
    })

    it('extracts tasks in markdown lists', () => {
      const filePath = 'test/repos/repo3/lists.md'
      var config = Config.newDefaultConfig()
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'test/repos/repo3', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      file.tasks[0].description.length.should.be.exactly(2)
      file.tasks[0].line.should.be.exactly(1)
      file.tasks[1].description.length.should.be.exactly(1)
      file.tasks[1].line.should.be.exactly(5)
    })

    it('extracts tasks with blank lines preserved', () => {
      const filePath = 'tmp/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = Config.newDefaultConfig()
      const project = { path: 'tmp/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content: content,
        languages: languages,
        project,
      })
      file.extractTasks(config)
      file.tasks
        .find((task) => task.list === 'DOING')
        .description.length.should.be.exactly(16)
    })

    it('should ignore tasks in files with kanban-plugin frontMatter', () => {
      var content = `---
kanban-plugin: true
---

- [A task](#TODO:)
`
      const project = { path: 'test' }
      var file = new File({
        repoId: 'test',
        filePath: 'test.md',
        content: content,
        languages: languages,
        project,
      })
      var config = Config.newDefaultConfig()
      file.extractTasks(config)
      file.tasks.length.should.be.exactly(0)
    })

    it('should ignore tasks in files with imdone_ignore frontMatter', () => {
      var content = `---
imdone_ignore: true
---

- [A task](#TODO:)
`
      const project = { path: 'test' }
      var file = new File({
        repoId: 'test',
        filePath: 'test.md',
        content: content,
        languages: languages,
        project,
      })
      var config = Config.newDefaultConfig()
      file.extractTasks(config)
      file.tasks.length.should.be.exactly(0)
    })
  })
})

describe("getCodePositions", () => {
  it("Returns an array code span and code block positions", async () => {
    const testFilePath = path.join(process.cwd(), 'test', 'repos', 'code-blocks', 'readme.md')
    const content = await fs.promises.readFile(testFilePath, "utf-8")
    const positions = File.getCodePositions(content)
    expect(positions.length).to.be(4)
    expect(content.substring(...positions[0])).to.be("`code`")
    expect(content.substring(...positions[1])).to.be("```java\nString one;\n// #TODO: A task in a codeblock\n```")
    expect(content.substring(...positions[2])).to.be("`#TODO a task`")
    expect(content.substring(...positions[3])).to.be("```\nanother code block #DOING: with a task\n```")
  })
})
