var should = require('should'),
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    Config = require('../lib/config'),
    File       = require('../lib/file'),
    util   = require('util'),
    path   = require('path'),
    fs     = require('fs'),
    wrench = require('wrench'),
    fsStore = require('../lib/mixins/repo-fs-store'),
    log    = require('debug')('imdone-core:repository-spec'),
    constants = require('../lib/constants'),
    languages = require('../lib/languages'),
    async  = require('async');

describe("Repository", function() {
  var tmpDir      = path.join(process.cwd(), "tmp"),
      tmpReposDir = path.join(tmpDir, "repos"),
      repoSrc  = path.join(process.cwd(), "test", "repos"),
      filesSrc = path.join(process.cwd(),"test","files"),
      repoDir  = path.join(tmpReposDir, "files"),
      repo1Dir = path.join(tmpReposDir, "repo1"),
      repo2Dir = path.join(tmpReposDir, "repo2"),
      repo, repo1, repo2, configDir;

  beforeEach(function() {
    wrench.mkdirSyncRecursive(tmpDir);
    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, {forceDelete: true});
    wrench.copyDirSyncRecursive(filesSrc, repoDir, {forceDelete: true});
    repo = fsStore(new Repository(repoDir));
    configDir = path.join(repo.getPath(), ".imdone");
    repo1 = fsStore(new Repository(repo1Dir));
    repo2 = fsStore(new Repository(repo2Dir));
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
      expect(err).to.be(null);
      expect(result.repo.length).to.be(4);
      expect(result.repo1.length).to.be(3);
      done();
    });
  });

  it("Should write and delete a file successfully", function(done) {
    repo1.init(function(err, files) {
      (files.length).should.be.exactly(3);
      var file = new File({repoId: repo1.getId(), filePath: "test.md", content: "[Add some content](#DONE:0)", languages:languages});
      repo1.writeFile(file, function(err, file) {
        expect(err).to.be(null);
        (file.tasks.length).should.be.exactly(1);
        repo1.deleteFile(file.path, function(err, file) {
          expect(err).to.be(null);
          (repo1.files.length).should.be.exactly(3);
          done();
        });
      });
    });
  });

  it("Should write and delete a file in a sub-dir successfully", function(done) {
    repo1.init(function(err, files) {
      (files.length).should.be.exactly(3);
      var file = new File({repoId: repo1.getId(), filePath: "some-dir/some-dir2/test.md", content: "[Add some content](#DONE:0)", languages:languages});
      repo1.writeFile(file, function(err, file) {
        expect(err).to.be(null);
        (file.tasks.length).should.be.exactly(1);
        repo1.deleteFile(file.path, function(err, file) {
          expect(err).to.be(null);
          (repo1.files.length).should.be.exactly(3);
          done();
        });
      });
    });
  });

  it("Should serialize and deserialize successfully", function(done) {
    repo.init(function(err, files) {
      (files.length).should.be.exactly(4);
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

  // describe("getFileTree", function() {
  //   it("Should traverse a repo and return valid files and dirs in cb", function(done) {
  //     repo2.init(function(err) {
  //       expect(err).to.be(null);
  //       repo2.getFileTree(function(err, out) {
  //         expect(err).to.be(null);
  //         done();
  //       });
  //     });
  //   });
  // });

  describe("hasDefaultFile", function(done) {
    it("Should return false if no default file exists", function(done) {
      repo.init(function(err, files) {
        expect(repo.hasDefaultFile()).to.be(false);
        done();
      });
    });

    it("Should return true if readme.md file exists", function(done) {
      var file = new File({repoId: repo.getId(), filePath: "reADmE.md", content: "[Add some content](#DONE:0)", languages:languages});
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
      var file = new File({repoId: repo.getId(), filePath: "hOmE.Md" ,content: "[Add some content](#DONE:0)", languages:languages});
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
        var file = new File({repoId: repo.getId(), filePath: "reADmE.md", content: "[Add some content](#DONE:0)", languages:languages});
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
        var file = new File({repoId: repo.getId(), filePath: "hOmE.Md", content: "[Add some content](#DONE:0)", languages:languages});
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
        var home = new File({repoId: repo.getId(), filePath: "hOmE.Md", content: "[Add some content](#DONE:0)", languages:languages});
        var readme = new File({repoId: repo.getId(), filePath: "reADmE.Md", content: "[Add some content](#DONE:0)", languages:languages});
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
            expect(err).to.be(null);
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
      repo.config = new Config(constants.DEFAULT_CONFIG);
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
        expect(err).to.be(null || undefined);
        expect(repo1.getTasksInList('TODO').length).to.be(3);
        repo1.renameList('TODO', 'PLANNING', function(err) {
          expect(err).to.be(null);
          expect(repo1.getTasksInList('PLANNING').length).to.be(3);
          expect(repo1.getTasksInList('TODO').length).to.be(0);
          done();
        });
      });
    });
  });

  describe("moveTasks", function(done) {
    it("Should move a task to the requested location in the requested list", function(done) {
      repo1.init(function(err, result) {
        var todo = repo1.getTasksInList("TODO");
        var taskToMove = todo[1];
        console.log(taskToMove);
        repo1.moveTasks([taskToMove], "DOING", 1, function(err) {
          expect(err).to.be(undefined);
          var doing = repo1.getTasksInList("DOING");
          (taskToMove.equals(doing[1])).should.be.true;
          done();
        });
      });
    });

    it("Should move a task to the requested location in the same list", function(done) {
      repo1.init(function(err, result) {
        var todo = repo1.getTasksInList("TODO");
        var taskToMove = todo[1];
        console.log(taskToMove);
        repo1.moveTasks([taskToMove], "TODO", 2, function() {
          (taskToMove.equals(repo1.getTasksInList("TODO")[2])).should.be.true;
          done();
        });
      });
    });

    it.skip("Should move multiple tasks to the requested location in the requested list", function(done) {
      repo.init(function(err, result) {
        var tasksToMove = repo.getTasksInList("TODO");
        repo.moveTasks(tasksToMove, "DONE", 0, function() {
          (repo.getTasksInList("TODO").length).should.be.exactly(0);
          (repo.getTasksInList("DONE").length).should.be.exactly(8);
          done();
        });

      });
    });
  });


  describe('plugin', function(done) {
    it('should return the named plugin object', function(done) {
      var name = path.join(process.cwd(), "test", "test-plugin");
      repo1.config = new Config(constants.DEFAULT_CONFIG);
      repo1.addPlugin(name, {foo:"bar"});
      repo1.saveConfig(function(err) {
        expect(err).to.be(null);
        repo1.init(function(err) {
          expect(err).to.be(null || undefined);
          var plugin = repo1.plugin(name);
          expect(plugin.config).to.be(repo1.config.plugins[name]);
          expect(plugin.repo).to.be(repo1);
          done();
        });
      });
    });
  });
});
