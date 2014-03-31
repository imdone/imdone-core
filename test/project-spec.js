var should     = require('should'), 
    expect     = require('expect.js'),
    Repository = require('../lib/repository'),
    Project    = require('../lib/project'),
    async      = require('async');

var repo1 = new Repository(process.cwd() + "/test/repos/repo1");
var repo2 = new Repository(process.cwd() + "/test/repos/repo2");

describe("Project", function() {
  describe("getTasks", function() {
    it("should return an array of lists with sorted tasks", function(done) {
      var project = new Project("Jesse", "My Project", [repo1, repo2]);
      project.init(function(err, result) {
        var lists = project.getTasks();
        (lists.length).should.be.exactly(2);
        (lists[0].name).should.equal('DOING');
        (lists[0].tasks.length).should.be.exactly(6);
        (lists[1].name).should.equal('TODO');
        (lists[1].tasks.length).should.be.exactly(6);
        done();
      });
    });

    it("should return an array of lists with sorted tasks for the listName provided", function(done) {
      var project = new Project("Jesse", "My Project", [repo1, repo2]);
      project.init(function(err, result) {
        var list = project.getTasks('DOING');
        (list.tasks.length).should.be.exactly(6);
        done();
      });
    });
  });
});