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

    util.inherits(SomeFile, File);

    SomeFile.prototype.extractTasks = function() {
      ok = true;
      return SomeFile.super_.prototype.extractTasks.apply(this);
    };

    var someFile = new SomeFile({repoId: 'test', filePath: 'test/files/sample.js', content: fs.readFileSync('test/files/sample.js', 'utf8'), languages: languages});

    expect(someFile instanceof File).to.be(true);
    expect(someFile instanceof SomeFile).to.be(true);
    expect(someFile.getType()).to.be("SomeFile");

    (someFile.extractTasks().tasks.length).should.be.exactly(7);
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
      (file.extractTasks().getTasks().length).should.be.exactly(7);
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

});
