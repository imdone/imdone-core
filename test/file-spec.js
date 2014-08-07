var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    File   = require('../lib/file'),
    util   = require('util'),
    fs     = require('fs');

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

    var someFile = new SomeFile('test', 'test/files/sample.js', fs.readFileSync('test/files/sample.js', 'utf8'));

    expect(someFile instanceof File).to.be(true);
    expect(someFile instanceof SomeFile).to.be(true);
    expect(someFile.getType()).to.be("SomeFile");

    (someFile.extractTasks().tasks.length).should.be.exactly(7);
    expect(ok).to.be(true);
  });

  describe("extractTasks", function() {
    it("Should find markdown tasks in a markdown file", function() {
      var content = fs.readFileSync('test/files/sample.md', 'utf8');
      var file = new File('test', 'test/files/sample.md', content);
      
      var expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(5);
      (file.extractTasks().getTasks().length).should.be.exactly(5);
      expectation.verify();      
    });

    it("Should find all tasks in a code file", function() {
      var content = fs.readFileSync('test/files/sample.js', 'utf8');
      var file = new File('test', 'test/files/sample.js', content);
      
      var expectation = sinon.mock();
      file.on("task.found", expectation);
      expectation.exactly(7);
      (file.extractTasks().getTasks().length).should.be.exactly(7);
      expectation.verify();      
    });

  });

});