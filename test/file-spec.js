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

    var someFile = new SomeFile('test/files/sample.js', fs.readFileSync('test/files/sample.js', 'utf8'));

    expect(someFile instanceof File).to.be(true);
    expect(someFile instanceof SomeFile).to.be(true);
    expect(someFile.getType()).to.be("SomeFile");

    (someFile.extractTasks().tasks.length).should.be.exactly(5);
    expect(ok).to.be(true);
  });

  it("Should find markdown tasks in a markdown file", function() {
    var content = fs.readFileSync('test/files/sample.md', 'utf8');
    var file = new File('test/files/sample.md', content);
    
    file.on("task", function(task) {
      // TODO: Use [Sinon.JS - Documentation](http://sinonjs.org/) for event tests
      console.log("Task:", task);
    });
    (file.extractTasks().tasks.length).should.be.exactly(4);
  });

  it("Should find all tasks in a code file", function() {
    var content = fs.readFileSync('test/files/sample.js', 'utf8');
    var file = new File('test/files/sample.js', content);
    
    file.on("task", function(task) {
      // TODO: Use [Sinon.JS - Documentation](http://sinonjs.org/) for event tests
      console.log("Task:", task);
    });
    (file.extractTasks().tasks.length).should.be.exactly(5);
  });

});