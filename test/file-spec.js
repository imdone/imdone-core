const { fail } = require('should')
var should = require('should'),
  expect = require('expect.js'),
  sinon = require('sinon'),
  File = require('../lib/file'),
  path = require('path'),
  constants = require('../lib/constants'),
  Config = require('../lib/config'),
  util = require('util'),
  languages = require('../lib/languages'),
  eol = require('eol'),
  fs = require('fs')
const Task = require('../lib/task')
const appContext = require('../lib/context/ApplicationContext')
const ProjectContext = require('../lib/ProjectContext')
const FileProjectContext = require('../lib/domain/entities/FileProjectContext')
appContext.register(FileProjectContext, new FileProjectContext())

describe('File', function () {
  it('should enable subclassing', function () {
    function SomeFile() {
      File.apply(this, arguments)
    }

    var ok
    var config = new Config(constants.DEFAULT_CONFIG)
    util.inherits(SomeFile, File)

    SomeFile.prototype.extractTasks = function (config) {
      ok = true
      return SomeFile.super_.prototype.extractTasks.call(this, config)
    }
    const filePath = path.join('test', 'files', 'sample.js')
    const content = fs.readFileSync('test/files/sample.js', 'utf8')
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
      var content = fs.readFileSync('test/files/test.js', 'utf8')
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/test.js',
        content: content,
        languages: languages,
        project,
      })

      for (var i = 1; i < 13; i++) {
        pos = file.getLinePos(i)
        console.log('line:%d pos:%d', i, pos)
        console.log('pos:%d line:%d', pos, file.getLineNumber(pos))
      }
    })
  })

  describe('deleteTask', () => {
    it('should delete a checkbox task with blank lines', () => {
      const filePath = 'test/files/checkbox-deletions.md'
      after = `
- [ ] [A new card with space](#TODO:-10)
  <card>
    
    space
    
    <!--
    created:2022-03-23T18:49:36.583Z
    -->
  </card>`.split(eol.lf).join(eol.auto)

      var config = new Config(constants.DEFAULT_CONFIG)
      config.settings = {
        doneList: 'DONE',
        cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
      }
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'test/files', config }
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
    it('should update metadata', () => {
      var config = new Config(constants.DEFAULT_CONFIG)
      config.settings = {
        doneList: 'DONE',
        cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
      }
      appContext.register(
        FileProjectContext,
        new ProjectContext({
          config,
          listExists: () => true,
          getTasksInList: () => [],
        })
      )
      var content = fs.readFileSync('test/files/update-metadata.md', 'utf8')
      const project = { config, path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/update-metadata.md',
        content: content,
        languages: languages,
        project,
      })
      file.extractAndTransformTasks(config)
      file.content.should.not.equal(content)
    })

    it('should complete tasks with checkbox beforeText in a md file', () => {
      var config = new Config(constants.DEFAULT_CONFIG)
      // BACKLOG:-50 Test with changes to config
      config.settings = {
        doneList: 'DONE',
        cards: {
          addCompletedMeta: true,
          metaNewLine: true,
          trackChanges: true,
        },
      }
      const filePath = 'test/files/update-metadata.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { config, path: 'test/files' }
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
      var config = new Config(constants.DEFAULT_CONFIG)
      // BACKLOG:-60 Test with changes to config
      config.settings = {
        doneList: 'DONE',
        cards: {
          addCompletedMeta: true,
          metaNewLine: true,
          trackChanges: true,
        },
      }
      const filePath = 'test/files/update-metadata.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { config, path: 'test/files' }
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
      var config = new Config(constants.DEFAULT_CONFIG)
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
      const filePath = 'test/files/checkbox-tasks.md'
      var content = fs.readFileSync(filePath, 'utf8')
      const project = { path: 'test/files', config }
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
      var config = new Config(constants.DEFAULT_CONFIG)
      var content = fs.readFileSync('test/files/sample.md', 'utf8')
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.md',
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
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.md',
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
        filePath: 'test/files/sample.md',
        content,
        languages,
        project,
      })
      tasks = file.extractTasks(config).getTasks()
      task = tasks.find((task) => task.order === 20)
      task.text.should.equal('A new task')
    })

    it('Should find all tasks in a code file', function () {
      var content = fs.readFileSync('test/files/sample.js', 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
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

    it('Should find all HASH_NO_ORDER tasks in a markdown file', function () {
      const filePath = 'test/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      file
        .extractTasks(config)
        .getTasks()
        .filter((task) => task.getType() === Task.Types.HASH_META_ORDER)
        .length.should.be.exactly(2)
      expectation.verify()
    })

    it('Should find all HASH_NO_ORDER tasks in a large markdown file', function () {
      const filePath = 'test/files/BIG-FILE.md'
      console.time('build content')

      const addTask = (list, order) => {
        const date = new Date()
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const min = date.getMinutes().toString().padStart(2, '0')
        const lf = String(eol.lf)
        return `[${year}-${month}-${day} ${hours}:${min}] #${list} Another task at ${order}${lf}<!-- created:${date.toISOString()} order:${order} -->${lf}${lf}`
      }
      const lists = {
        TODO: 20,
        DOING: 10,
        DONE: 600,
      }

      let content = ''
      Object.keys(lists).forEach((list) => {
        for (let n = 0; n < lists[list]; n++) {
          content += addTask(list, n)
        }
      })
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath,
        content,
        languages,
        project,
      })

      file.extractTasks(config).getTasks().length.should.be.exactly(630)
      console.timeEnd('build content')
    })
  })

  describe('modifyTaskFromContent', function () {
    it('Should modfy a description from content', function () {
      var config = new Config(constants.DEFAULT_CONFIG)
      var content = fs.readFileSync('test/files/sample.md', 'utf8')
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.md',
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
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      task.preserveBlankLines.should.be.ok()
      task.description.length.should.be.exactly(4)
    })

    it('replaces content in  a task without blank lines with content containing blank lines', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      task.preserveBlankLines.should.be.ok()
      task.description.length.should.be.exactly(4)
    })
  })

  describe('modifyTaskFromHtml', () => {
    it('should modify a task that contains <code> tags', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      const filePath = 'test/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      const filePath = 'test/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
        content: fs.readFileSync('test/files/sample.js', 'utf8'),
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
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
        content: fs.readFileSync('test/files/sample.js', 'utf8'),
        languages: languages,
        project,
      })
      file.extractTasksInCodeFile(new Config(constants.DEFAULT_CONFIG))
      console.log(file.tasks)
    })
  })

  describe('trimCommentBlockStart', () => {
    it('should trim the code block start pattern from a line of text', () => {
      var content = fs.readFileSync('test/files/sample.js', 'utf8')
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
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
      var content = fs.readFileSync('test/files/sample.js', 'utf8')
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
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
      var content = fs.readFileSync('test/files/sample.js', 'utf8')
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
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
      var content = fs.readFileSync('test/files/sample.js', 'utf8')
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
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
      var content = fs.readFileSync('test/files/sample.js', 'utf8')
      const project = { path: 'test/files' }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.js',
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
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      var content = fs.readFileSync('test/files/descriptions.js', 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/descriptions.js',
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
      file.tasks[3].description.length.should.be.exactly(0)
      file.tasks[3].line.should.be.exactly(13)
      file.tasks[4].description.length.should.be.exactly(1)
      file.tasks[4].line.should.be.exactly(14)
    })

    it('sets the correct beforeText for hash and link style tasks', () => {
      var content = fs.readFileSync('test/files/sample.md', 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
      var file = new File({
        repoId: 'test',
        filePath: 'test/files/sample.md',
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
      var config = new Config(constants.DEFAULT_CONFIG)
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
      var config = new Config(constants.DEFAULT_CONFIG)
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
      file.tasks[1].description.length.should.be.exactly(0)
      file.tasks[1].line.should.be.exactly(5)
    })

    it('extracts tasks with blank lines preserved', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8')
      var config = new Config(constants.DEFAULT_CONFIG)
      const project = { path: 'test/files', config }
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
      var config = new Config(constants.DEFAULT_CONFIG)
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
      var config = new Config(constants.DEFAULT_CONFIG)
      file.extractTasks(config)
      file.tasks.length.should.be.exactly(0)
    })
  })
})
