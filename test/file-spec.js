const { fail } = require('should');
var should    = require('should'),
    expect    = require('expect.js'),
    sinon     = require('sinon'),
    File      = require('../lib/file'),
    path      = require('path'),
    constants = require('../lib/constants'),
    Config    = require('../lib/config'),
    util      = require('util'),
    languages = require('../lib/languages'),
    eol       = require('eol'),
    fs        = require('fs');
const Task = require('../lib/task');

describe('File', function() {

  it('should enable subclassing', function() {

    function SomeFile() {
      File.apply(this, arguments);
    }

    var ok;
    var config = new Config(constants.DEFAULT_CONFIG);
    util.inherits(SomeFile, File);

    SomeFile.prototype.extractTasks = function(config) {
      ok = true;
      return SomeFile.super_.prototype.extractTasks.call(this, config);
    };
    const filePath = path.join('test','files','sample.js')
    const content = fs.readFileSync('test/files/sample.js', 'utf8')
    var someFile = new SomeFile({repoId: 'test', filePath, content, languages: languages});

    expect(someFile instanceof File).to.be(true);
    expect(someFile instanceof SomeFile).to.be(true);
    expect(someFile.getType()).to.be("SomeFile");

    (someFile.extractTasks(config).tasks.length).should.be.exactly(8);
    expect(ok).to.be(true);
  });

  describe('getLinePos', function() {
    it('should give the correct line position for each line of a file', function() {
      var content = fs.readFileSync('test/files/test.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/test.js', content: content, languages:languages});

      for (var i=1; i < 13;i++) {
        pos = file.getLinePos(i);
        console.log("line:%d pos:%d", i, pos);
        console.log("pos:%d line:%d", pos, file.getLineNumber(pos));
      }

    });
  });

  describe('transformTasks', () => {
    it('should update metadata', () => {
      var config = new Config(constants.DEFAULT_CONFIG);
      config.settings = {doneList: "DONE", cards:{metaNewLine:true}}
      var content = fs.readFileSync('test/files/update-metadata.md', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/update-metadata.md', content: content, languages:languages});
      file.extractTasks(config, true)
      file.content.should.not.equal(content)
    })

    it('should complete tasks with checkbox beforeText in a md file', () => {
      var config = new Config(constants.DEFAULT_CONFIG);
      // TODO: Test with changes to config
      config.settings = {doneList: "DONE", cards:{metaNewLine:true, trackChanges:true}}
      const filePath = 'test/files/update-metadata.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages});
      file.extractTasks(config, true)
      const lines = eol.split(file.content)
      lines[14].should.equal('- [x] [A card in a checklist](#DONE:)')
      lines[19].should.equal('- [x] #DONE: make sure this is checked')
      lines[24].should.equal('- [x] #DONE make sure this is checked 3')
    })

    it('should uncomplete tasks with checkbox beforeText in a md file', () => {
      var config = new Config(constants.DEFAULT_CONFIG);
      // TODO: Test with changes to config
      config.settings = {doneList: "DONE", cards:{metaNewLine:true, trackChanges:true}}
      const filePath = 'test/files/update-metadata.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages});
      file.extractTasks(config, true)
      const lines = eol.split(file.content)
      lines[29].should.equal('- [ ] [Make sure this is unchecked](#TODO:)')
      lines[33].should.equal('- [ ] #TODO: Make sure this is unchecked 2')
      lines[37].should.equal('- [ ] #TODO Make sure this is unchecked 3')
    })
  })

  describe("extractTasks", function() {
    it("Should find markdown tasks in a markdown file", function() {
      var content = fs.readFileSync('test/files/sample.md', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.md', content: content, languages:languages});

      var expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(8);
      var config = new Config(constants.DEFAULT_CONFIG);
      (file.extractTasks(config).getTasks().length).should.be.exactly(8);
      (file.tasks[2].description.length).should.be.exactly(2)
      expectation.verify();
    });

    it("Should leave embeded [] alone in link style tasks", function() {
      var content = fs.readFileSync('test/files/sample.md', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.md', content, languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      const tasks = file.extractTasks(config).getTasks()
      const task = tasks.find(task => task.order === 20)
      task.text.should.equal('Create Placeholder for adding new cards with [space].')
    })

    it("Should not include content in brackets before a task", function() {
      content = '[2021-12-01 12:00] #DOING:20 A new task'
      var file = new File({repoId: 'test', filePath: 'test/files/sample.md', content, languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      let tasks = file.extractTasks(config).getTasks()
      let task = tasks.find(task => task.order === 20)
      task.text.should.equal('A new task')

      content = '[2021-12-01 12:00] [A new task](#DOING:20)'
      file = new File({repoId: 'test', filePath: 'test/files/sample.md', content, languages});
      tasks = file.extractTasks(config).getTasks()
      task = tasks.find(task => task.order === 20)
      task.text.should.equal('A new task')
    })

    it("Should find all tasks in a code file", function() {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});

      var expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(8);
      var config = new Config(constants.DEFAULT_CONFIG);
      (file.extractTasks(config).getTasks().length).should.be.exactly(8);
      expectation.verify();
    });

    it("Should find all HASH_NO_ORDER tasks in a markdown file", function() {
      const filePath = 'test/files/hash-no-order.md';
      var content = fs.readFileSync(filePath, 'utf8');
      var config = new Config(constants.DEFAULT_CONFIG);
      var file = new File({repoId: 'test', filePath, content, languages});

      const expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(3);
      (file.extractTasks(config).getTasks().filter(task => task.getType() === Task.Types.HASH_META_ORDER).length).should.be.exactly(2);
      expectation.verify();
    });
  });

  describe("modifyTaskFromContent", function() {
    it("Should modfy a description from content", function() {
      var content = fs.readFileSync('test/files/sample.md', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.md', content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      (file.extractTasks(config).getTasks().length).should.be.exactly(8);
      (file.tasks[2].description.length).should.be.exactly(2)
      file.modifyTaskFromContent(file.tasks[2], 'task 1 +okay\n- A description line\n- [ ] a sub task\n', config)
      file.tasks[2].description.length.should.be.exactly(2)
    });

    it('modifies a task that contains <code> tags', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      const task = file.tasks.find(task => task.list === 'DOING')
      task.description.length.should.be.exactly(16)
      file.modifyTaskFromContent(task, 'This is \n  \n A multiline \n     \n comment', config)
      task.preserveBlankLines.should.be.ok()
      task.description.length.should.be.exactly(4)
    })

    it('replaces content in  a task without blank lines with content containing blank lines', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      const task = file.tasks.find(task => task.list === 'TODO')
      task.description.length.should.be.exactly(2)
      file.modifyTaskFromContent(task, 'This is \n  \n A multiline \n     \n comment', config)
      task.preserveBlankLines.should.be.ok()
      task.description.length.should.be.exactly(4)
    })
  });

  describe('modifyTaskFromHtml', () => {
    it('should modify a task that contains <code> tags', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      const task = file.tasks.find(task => task.list === 'DOING')
      task.description.length.should.be.exactly(16)
      file.modifyTaskFromHtml(task, '<div class="task-description"><input type="checkbox" checked><input>', config)
      const modifiedFile = new File({repoId: 'test', filePath, content: file.content, languages:languages});
      modifiedFile.extractTasks(config)
      const modifiedTask = modifiedFile.tasks.find(task => task.list === 'DOING')
      modifiedTask.getProgress().completed.should.be.exactly(1)
    })
  })

  describe('modifyTask', () => {
    it('should modify a HASH_NO_ORDER task that has no order metadata', () => {
      const filePath = 'test/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      const task = file.tasks.find(task => task.list === 'DONE')
      task.order = 100
      file.modifyTask(task, config, true)
      task.meta.order[0].should.equal(100)
      task.meta.order.length.should.be.exactly(1)
    })

    it('should modify a HASH_NO_ORDER task that has order metadata', () => {
      const filePath = 'test/files/hash-no-order.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      const task = file.tasks.find(task => task.list === 'TODO')
      task.order = 100
      file.modifyTask(task, config, true)
      task.meta.order[0].should.equal(100)
      task.meta.order.length.should.be.exactly(1)
    })
  })

  describe("getCodeCommentRegex", function() {
    it("Should return the regex for a given file type", function() {
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: fs.readFileSync('test/files/sample.js', 'utf8'), languages:languages});
      myRe = file.getCodeCommentRegex();
      console.log(myRe);
      str = file.getContent();
      var myArray;
      while ((myArray = myRe.exec(str)) !== null) {
        console.log("Found %s at %d.  Next match starts at %d", myArray[0], myArray.index, myRe.lastIndex);
      }
    });
  });

  describe("extractTasksInCodeFile", function() {
    it("Should extract code style tasks from a code file", function() {
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: fs.readFileSync('test/files/sample.js', 'utf8'), languages:languages});
      file.extractTasksInCodeFile(new Config(constants.DEFAULT_CONFIG));
      console.log(file.tasks);
    })
  });

  describe('trimCommentBlockStart', () => {
    it('should trim the code block start pattern from a line of text', () => {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});
      file.trimCommentBlockStart('/* This is a comment').should.equal('This is a comment');
      file.trimCommentBlockStart('/*This is a comment').should.equal('This is a comment');
      file.trimCommentBlockStart(' /*This is a comment').should.equal('This is a comment');
      file.trimCommentBlockStart('  /* This is a comment').should.equal('This is a comment');
      file.trimCommentBlockStart('   /* This is a comment').should.equal('This is a comment');
      file.trimCommentBlockStart('   /*  This is a comment').should.equal(' This is a comment');
    })
  })

  describe('trimCommentBlockIgnore', () => {
    it('should trim the code block ignore pattern from a line of text', () => {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});
      file.trimCommentBlockIgnore('* This is a comment').should.equal('This is a comment');
      file.trimCommentBlockIgnore('*This is a comment').should.equal('This is a comment');
      file.trimCommentBlockIgnore(' *This is a comment').should.equal('This is a comment');
      file.trimCommentBlockIgnore('  * This is a comment').should.equal('This is a comment');
    })
  })

  describe('trimCommentBlockEnd', () => {
    it('should trim the code block end pattern from a line of text', () => {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});
      file.trimCommentBlockEnd('This is a comment */').should.equal('This is a comment');
      file.trimCommentBlockEnd('This is a comment*/').should.equal('This is a comment');
      file.trimCommentBlockEnd('*/').should.equal('');
      file.trimCommentBlockEnd('*/ ').should.equal('');
      file.trimCommentBlockEnd(' */ ').should.equal('');
      file.trimCommentBlockEnd(' */  ').should.equal('');
    })
  })

  describe('trimCommentStart', () => {
    it('should trim the comment start from a line of text', () => {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});
      file.trimCommentStart('//This is a comment').should.equal('This is a comment');
      file.trimCommentStart(' // This is a comment').should.equal('This is a comment');
      file.trimCommentStart('  // This is a comment').should.equal('This is a comment');
      file.trimCommentStart('  //  This is a comment').should.equal(' This is a comment');
    })
  })

  describe('trimCommentChars', () => {
    it('should trim the code block end pattern from a line of text', () => {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});
      file.trimCommentChars('This is a comment */').should.equal('This is a comment');
      file.trimCommentChars('This is a comment*/').should.equal('This is a comment');
      file.trimCommentChars('*/').should.equal('');
      file.trimCommentChars('*/ ').should.equal('');
      file.trimCommentChars(' */ ').should.equal('');
      file.trimCommentChars(' */  ').should.equal('');
    })
  })
  describe('hasTaskInText', () => {
    it('returns truthy if a line has a task', () => {
      const filePath = path.join('test','files','sample.js')
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      should(file.hasTaskInText(config, 'TODO: a task')).be.ok()
      should(file.hasTaskInText(config, '[a task](#TODO:0)')).be.ok()
      should(file.hasTaskInText(config, 'well a task')).not.be.ok()
      should(file.hasTaskInText(config, '#TODO: a task')).be.ok()
    })
  })
  describe('extractTasks', () => {
    it('extracts tasks and descriptions', () => {
      var content = fs.readFileSync('test/files/descriptions.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/descriptions.js', content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
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
      var content = fs.readFileSync('test/files/sample.md', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.md', content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      file.tasks.find(task => task.text === "Find tasks in markdown comments").beforeText.should.equal('# ')
      file.tasks.find(task => task.text === "Create Placeholder for adding new cards with [space].").beforeText.should.equal('## ')
    })

    it('extracts tasks in a c sharp file', () => {
      var content = fs.readFileSync('test/repos/repo3/KillSurvivorCommandHandler.cs', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/repos/repo3/KillSurvivorCommandHandler.cs', content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
    })

    it('extracts tasks in markdown lists', () => {
      const filePath = 'test/repos/repo3/lists.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      file.tasks[0].description.length.should.be.exactly(2)
      file.tasks[0].line.should.be.exactly(1)
      file.tasks[1].description.length.should.be.exactly(0)
      file.tasks[1].line.should.be.exactly(5)
    })

    it('extracts tasks with blank lines preserved', () => {
      const filePath = 'test/files/preserve-blank-lines.md'
      var content = fs.readFileSync(filePath, 'utf8');
      var file = new File({repoId: 'test', filePath, content: content, languages:languages});
      var config = new Config(constants.DEFAULT_CONFIG);
      file.extractTasks(config);
      file.tasks.find(task => task.list === 'DOING').description.length.should.be.exactly(16)
    })
  })
});
