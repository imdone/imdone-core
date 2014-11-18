var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    File       = require('../lib/file'),
    util   = require('util'),
    path   = require('path'),
    fs     = require('fs'),
    wrench = require('wrench'),
    fsStore = require('../lib/mixins/repo-fs-store'),
    log    = require('debug')('imdone-core:repository-spec'),
    async  = require('async');

describe("Repository", function() {
  var tmpDir      = path.join(process.cwd(), "tmp"),
      tmpReposDir = path.join(tmpDir, "repos"),
      repoSrc  = path.join(process.cwd(), "test", "repos"),
      repo1Dir = path.join(tmpReposDir, "repo1"),
      repo2Dir = path.join(tmpReposDir, "repo2"),
      repo, repo1, repo2, configDir;

  beforeEach(function() {
    wrench.mkdirSyncRecursive(tmpDir);
    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, {forceDelete: true});
    repo = fsStore(new Repository(path.join(process.cwd(),"test","files"), {watcher:false}));
    configDir = path.join(repo.getPath(), ".imdone");
    repo1 = fsStore(new Repository(repo1Dir, {watcher:false}));
    repo2 = fsStore(new Repository(repo2Dir, {watcher:false}));
  });

  afterEach(function() {
    repo1.destroy();
    repo2.destroy();
    repo.destroy();
    wrench.rmdirSyncRecursive(tmpDir, true);
  });

  it("Should init successfully", function(done) {
    async.series({
      repo: function(cb) {
        repo.init(function(err, files) {
          if (err) return cb(err);
          // log("files:", files);
          cb(null, files);
        });
      },
      repo1: function(cb) {
        repo1.init(function(err, files) {
          if (err) return cb(err);
          // log("files:", files);
          cb(null, files);
        });
      }
    }, function(err, result) {
      expect(err).to.be(undefined);
      expect(result.repo.length).to.be(2);
      expect(result.repo1.length).to.be(2);
      done();
    });
  });

  it("Should write and delete a file successfully", function(done) {
    repo1.init(function(err, files) {
      (files.length).should.be.exactly(2);
      var file = new File(repo1.getId(), "test.md","[Add some content](#DONE:0)");
      repo1.writeFile(file, function(err, file) {
        expect(err).to.be(null);
        (file.tasks.length).should.be.exactly(1);
        repo1.deleteFile(file.path, function(err, file) {
          expect(err).to.be(null);
          (repo1.files.length).should.be.exactly(2);
          done();
        });
      });
    });
  });

  it("Should write and delete a file in a sub-dir successfully", function(done) {
    repo1.init(function(err, files) {
      (files.length).should.be.exactly(2);
      var file = new File(repo1.getId(), "some-dir/some-dir2/test.md","[Add some content](#DONE:0)");
      repo1.writeFile(file, function(err, file) {
        expect(err).to.be(null);
        (file.tasks.length).should.be.exactly(1);
        repo1.deleteFile(file.path, function(err, file) {
          expect(err).to.be(null);
          (repo1.files.length).should.be.exactly(2);
          done();
        });
      });
    });
  });

  it("Should serialize and deserialize successfully", function(done) {
    repo.init(function(err, files) {
      (files.length).should.be.exactly(2);
      var sr = repo.serialize();
      Repository.deserialize(sr, function(err, newRepo) {
        newRepo = fsStore(newRepo);
        newRepo.init(function(err) {
          (newRepo.getFiles().length).should.be.exactly(repo.getFiles().length);
          (newRepo.getTasks().length).should.be.exactly(repo.getTasks().length);
          (newRepo.getLists().length).should.be.exactly(repo.getLists().length);
          done();
        });
      });
    });
  });

  describe("hasDefaultFile", function(done) {
    it("Should return false if no default file exists", function(done) {
      repo.init(function(err, files) {
        expect(repo.hasDefaultFile()).to.be(false);
        done();
      });
    });

    it("Should return true if readme.md file exists", function(done) {
      var file = new File(repo.getId(), "reADmE.md","[Add some content](#DONE:0)");
      repo.init(function(err, files) {
        repo.writeFile(file, function(err, file) {
          expect(repo.hasDefaultFile()).to.be(true);

          repo.deleteFile(file.path, function(err, file) {
            done();
          });
        });
      });
    });

    it("Should return true if home.md file exists", function(done) {
      var file = new File(repo.getId(), "hOmE.Md","[Add some content](#DONE:0)");
      repo.init(function(err, files) {
        repo.writeFile(file, function(err, file) {
          expect(repo.hasDefaultFile()).to.be(true);

          repo.deleteFile(file.path, function(err, file) {
            done();
          });
        });
      });
    });

  });

  describe("getDefaultFile", function(done) {
    it("should return undefined if a default file doesn't exist", function(done) {
      repo.init(function(err, files) {
        expect(repo.getDefaultFile()).to.be(undefined);
        done();
      });
    });

    it("should return readme.md if it exist", function(done) {
      repo.init(function(err, files) {
        var file = new File(repo.getId(), "reADmE.md","[Add some content](#DONE:0)");
        repo.writeFile(file, function(err, file) {
          expect(repo.getDefaultFile()).to.be(file);

          repo.deleteFile(file.path, function(err, file) {
            done();
          });
        });
      });
    });

    it("Should return home.md if it exists", function(done) {
      repo.init(function(err, files) {
        var file = new File(repo.getId(), "hOmE.Md","[Add some content](#DONE:0)");
        repo.writeFile(file, function(err, file) {
          expect(repo.getDefaultFile()).to.be(file);

          repo.deleteFile(file.path, function(err, file) {
            done();
          });
        });
      });
    });

    it("Should return readme.md if both home.md and readme.md exist", function(done) {
      repo.init(function(err, files) {
        var home = new File(repo.getId(), "hOmE.Md","[Add some content](#DONE:0)");
        var readme = new File(repo.getId(), "reADmE.Md","[Add some content](#DONE:0)");
        async.parallel([
          function(cb){
            repo.writeFile(home, function(err, file) {
              cb(null, file);
            });
          },
          function(cb){
            repo.writeFile(readme, function(err, file) {
              cb(null, file);
            });
          }
        ],
        function(err, results){
          expect(repo.getDefaultFile()).to.be(readme);

          async.parallel([
            function(cb){
              repo.deleteFile(home.path, function(err, file) {
                cb(null, file);
              });
            },
            function(cb){
              repo.deleteFile(readme.path, function(err, file) {
                cb(null, file);
              });
            }
          ],
          function(err, results) {
            expect(err).to.be(undefined);
            done();
          })
        });

      });

    });

  });

  describe("saveConfig", function() {
    it("Should save the config file", function(done) {
      repo.saveConfig(function(err) {
        expect(err).to.be(null);
        expect(fs.existsSync(configDir)).to.be(true);
        wrench.rmdirSyncRecursive(configDir, true);
        expect(fs.existsSync(configDir)).to.be(false);
        done();
      });
    });
  });

  describe("loadConfig", function(done) {
    it("Should load the config file", function(done) {
      repo.config.foo = "bar";
      repo.saveConfig(function(err) {
        expect(fs.existsSync(configDir)).to.be(true);
        repo.loadConfig(function(err) {
          expect(repo.config.foo).to.be("bar");
          wrench.rmdirSyncRecursive(configDir, true);
          expect(fs.existsSync(configDir)).to.be(false);
          done();
        });
      });
    });
  });

  describe("renameList", function(done) {
    it('should modify the list name in tasks with a given list name', function(done) {
      repo1.init(function(err, files) {
        expect(err).to.be(undefined);
        expect(repo1.getTasksInList('TODO').length).to.be(3);
        repo1.renameList('TODO', 'PLANNING', function(err) {
          expect(err).to.be(undefined);
          expect(repo1.getTasksInList('TODO').length).to.be(0);
          expect(repo1.getTasksInList('PLANNING').length).to.be(3);
          done();
        });
      });
    });
  });

  describe('plugin', function(done) {
    it('should return the named plugin object', function(done) {
      var name = path.join(process.cwd(), "test", "test-plugin");
      repo1.addPlugin(name, {foo:"bar"});
      repo1.saveConfig(function(err) {
        expect(err).to.be(null);
        repo1.init(function(err) {
          expect(err).to.be(undefined);
          var plugin = repo1.plugin(name);
          expect(plugin.config).to.be(repo1.config.plugins[name]);
          expect(plugin.repo).to.be(repo1);
          done();
        });
      });
    });
  });
});