var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    util   = require('util'),
    fs     = require('fs');

describe("Repository", function() {
  it("Should init successfully", function() {
    var repo = new Repository(process.cwd());
    repo.on("file.update", function(file) {
      console.log(file.toJSON());
      console.log(file.tasks);
    });
    repo.init();
    //repo.init();
  });
});