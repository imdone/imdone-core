var should     = require('should'), 
    _          = require('lodash'),
    expect     = require('expect.js'),
    Repository = require('../lib/repository'),
    Project    = require('../lib/project'),
    wrench     = require('wrench'),
    async      = require('async');

var repo1 = new Repository(process.cwd() + "/test/repos/repo1");
var repo2 = new Repository(process.cwd() + "/test/repos/repo2");

describe("Project", function() {
  describe("getTasks", function() {
    it("should return an array of lists with sorted tasks", function(done) {
      var project = new Project("Jesse", "My Project", [repo1, repo2]);
      project.init(function(err, result) {
        var lists = project.getTasks();
        (lists.length).should.be.exactly(3);
        var DONE = _.find(lists, {name:"DONE"});
        (DONE.tasks.length).should.be.exactly(1);
        var TODO = _.find(lists, {name:"TODO"});
        (TODO.tasks.length).should.be.exactly(6);
        var DOING = _.find(lists, {name:"DOING"});
        (DOING.tasks.length).should.be.exactly(6);
        done();
      });
    });

    it("should return an array of lists with sorted tasks for the repo provided", function(done) {
      var project = new Project("Jesse", "My Project", [repo1, repo2]);
      project.init(function(err, result) {
        var lists = project.getTasks(repo1.getId());
        (lists.length).should.be.exactly(2);
        var TODO = _.find(lists, {name:"TODO"});
        (TODO.tasks.length).should.be.exactly(3);
        var DOING = _.find(lists, {name:"DOING"});
        (DOING.tasks.length).should.be.exactly(3);
        done();
      });
    });
  });

  describe("getLists", function() {
    it("should return the lists from a single repository", function(done) {
      var project = new Project("Jesse", "My Project", [repo1,repo2]);
      project.init(function(err, result) {
        var lists = project.getLists(repo1.getId());
        (lists.length).should.be.exactly(2);
        done();
      });
    });

    it("should return the lists from all repositories", function(done) {
      var project = new Project("Jesse", "My Project", [repo1, repo2]);
      project.init(function(err, result) {
        var lists = project.getLists();
        (lists.length).should.be.exactly(3);
        done();
      });
    });
  });
});