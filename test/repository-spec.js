var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    util   = require('util'),
    fs     = require('fs');

describe("Repository", function() {
  it("Should init successfully", function(done) {
    var repo = new Repository(process.cwd() + "/test/files");
    repo.init(function(err, files) {
      (files.length).should.be.exactly(2);
      done();
    });
  });

  it("Should write a file successfully", function(done) {
    var repo = new Repository(process.cwd() + "/test/files");
    repo.init(function(err, files) {
      (files.length).should.be.exactly(2);
      var file = new File("test.md","[Add some content](#DONE:0)");
      repo.writeFile(file, function(err, tasks) {
        (tasks.length).should.be.exactly(1);
        done();
      })
    });

  });
});