var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    File       = require('../lib/file'),
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
      repo.writeFile(file, function(err, file) {
        (file.tasks.length).should.be.exactly(1);
        repo.deleteFile(file.id, function(err, file) {
          expect(err).to.be(null);
          (repo.files.length).should.be.exactly(2);
          done();
        });
      })
    });

  });
});