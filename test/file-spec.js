var should    = require('should'),
    expect    = require('expect.js'),
    sinon     = require('sinon'),
    File      = require('../lib/file'),
    constants = require('../lib/constants'),
    Config    = require('../lib/config'),
    util      = require('util'),
    languages = require('../lib/languages'),
    fs        = require('fs');

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

    var someFile = new SomeFile({repoId: 'test', filePath: 'test/files/sample.js', content: fs.readFileSync('test/files/sample.js', 'utf8'), languages: languages});

    expect(someFile instanceof File).to.be(true);
    expect(someFile instanceof SomeFile).to.be(true);
    expect(someFile.getType()).to.be("SomeFile");

    (someFile.extractTasks(config).tasks.length).should.be.exactly(7);
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

  describe("extractTasks", function() {
    it("Should find markdown tasks in a markdown file", function() {
      var content = fs.readFileSync('test/files/sample.md', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.md', content: content, languages:languages});

      var expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(5);
      (file.extractTasks().getTasks().length).should.be.exactly(5);
      expectation.verify();
    });

    it("Should find all tasks in a code file", function() {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});

      var expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(7);
      var config = new Config(constants.DEFAULT_CONFIG);
      (file.extractTasks(config).getTasks().length).should.be.exactly(7);
      expectation.verify();
    });

  });

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
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File({repoId: 'test', filePath: 'test/files/sample.js', content: content, languages:languages});
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
      file.tasks[1].description.length.should.be.exactly(1)
      file.tasks[2].description.length.should.be.exactly(2)
      file.tasks[3].description.length.should.be.exactly(0)
      file.tasks[4].description.length.should.be.exactly(1)
    })
  })
});
