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
});