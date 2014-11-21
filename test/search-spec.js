var should       = require('should'), 
    _            = require('lodash'),
    expect       = require('expect.js'),
    Repository   = require('../lib/repository'),
    repoStore    = require('../lib/mixins/repo-fs-store'),
    Project      = require('../lib/project'),
    projectStore = require('../lib/mixins/project-fs-store'),
    Search       = require('../lib/search'),
    wrench       = require('wrench'),
    log          = require('debug')('imdone-core:project-spec'),
    path         = require('path'),
    stringify    = require('json-stringify-safe'),
    async        = require('async');

describe("Search", function() {
  var tmpDir      = path.join(process.cwd(), "tmp"),
      tmpReposDir = path.join(tmpDir, "repos"),
      tmpCfgDir   = path.join(tmpDir, "user-home"),
      repoSrc  = path.join(process.cwd(), "test", "repos"),
      repo1Dir = path.join(tmpReposDir, "repo1"),
      repo2Dir = path.join(tmpReposDir, "repo2"),
      repo1,
      repo2;

  beforeEach(function() {
    wrench.mkdirSyncRecursive(tmpDir);
    wrench.mkdirSyncRecursive(path.join(tmpCfgDir,".imdone"));
    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, {forceDelete: true});
    repo1 = repoStore(new Repository(repo1Dir, {watcher:false}));
    repo2 = repoStore(new Repository(repo2Dir, {watcher:false}));
  });

  afterEach(function() {
    repo1.destroy();
    repo2.destroy();
    wrench.rmdirSyncRecursive(tmpDir, true);
  });

  describe("find", function(done) {
    it("Runs a search and returns a result", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var search = new Search({project:project, query:"task"});
        search.find(function(err, result) {
          expect(search.hits).to.be(13);
          expect(search.total).to.be(13);
          done();
        });
      });      
    });

    it("Should skip the first 10 results if offset is 10", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]), tmpCfgDir);
      project.init(function(err, result) {
        var search = new Search({project:project, query:"task", offset:10});
        search.find(function(err, result) {
          expect(search.hits).to.be(13);
          expect(search.total).to.be(3);
          done();
        });
      });      
    })
  });
});