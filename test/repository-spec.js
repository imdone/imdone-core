var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    File       = require('../lib/file'),
    util   = require('util'),
    path   = require('path'),
    fs     = require('fs'),
    wrench = require('wrench'),
    log    = require('debug')('imdone-core:repository-spec');
    async  = require('async');


/* 

var Repository = require('./repository');
var repo = new Repository('/home/jesse/projects/imdone-core/test/files');
repo.init();

*/

var repo = new Repository(path.join(process.cwd(),"test","files"), {watcher:false});
var configDir = path.join(repo.getPath(), ".imdone");

describe("Repository", function() {
  it("Should init successfully", function(done) {
    repo.init(function(err, files) {
      (files.length).should.be.exactly(2);
      done();
    });
  });

  it("Should write and delete a file successfully", function(done) {
    repo.init(function(err, files) {
      (files.length).should.be.exactly(2);
      var file = new File(repo.getId(), "test.md","[Add some content](#DONE:0)");
      repo.writeFile(file, function(err, file) {
        (file.tasks.length).should.be.exactly(1);
        repo.deleteFile(file.path, function(err, file) {
          expect(err).to.be(null);
          (repo.files.length).should.be.exactly(2);
          done();
        });
      });
    });
  });

  it("Should serialize and deserialize successfully", function(done) {
    repo.init(function(err, files) {
      (files.length).should.be.exactly(2);
      var sr = repo.serialize();
      Repository.deserialize(sr, function(newRepo) {
        (newRepo.getFiles().length).should.be.exactly(repo.getFiles().length);
        (newRepo.getTasks().length).should.be.exactly(repo.getTasks().length);
        (newRepo.getLists().length).should.be.exactly(repo.getLists().length);
        done();
      });
    });
  });

  describe("hasDefaultFile", function() {
    it("Should return false if no default file exists", function() {
      repo.init(function(err, files) {
        expect(repo.hasDefaultFile()).to.be(false);
      });
    });

    it("Should return true if readme.md file exists", function(done) {
      repo.init(function(err, files) {
        var file = new File(repo.getId(), "reADmE.md","[Add some content](#DONE:0)");
        repo.writeFile(file, function(err, file) {
          expect(repo.hasDefaultFile()).to.be(true);

          repo.deleteFile(file.path, function(err, file) {
            done();
          });
        });
      });
    });

    it("Should return true if home.md file exists", function(done) {
      repo.init(function(err, files) {
        var file = new File(repo.getId(), "hOmE.Md","[Add some content](#DONE:0)");
        repo.writeFile(file, function(err, file) {
          expect(repo.hasDefaultFile()).to.be(true);

          repo.deleteFile(file.path, function(err, file) {
            done();
          });
        });
      });
    });

  });

  describe("getDefaultFile", function() {
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
            done();
          })
        });

      });

    });

  });

  describe("saveConfig", function() {
    it("Should save the config file", function() {
      repo.saveConfig();
      expect(fs.existsSync(configDir)).to.be(true);
      wrench.rmdirSyncRecursive(configDir, true);
      expect(fs.existsSync(configDir)).to.be(false);
    });
  });

  describe("loadConfig", function() {
    it("Should load the config file", function(done) {
      repo.config.foo = "bar";
      repo.saveConfig(function(err) {
        expect(fs.existsSync(configDir)).to.be(true);
        repo.loadConfig();
        expect(repo.config.foo).to.be("bar");
        wrench.rmdirSyncRecursive(configDir, true);
        expect(fs.existsSync(configDir)).to.be(false);
        done();
      });
    });
  });

  describe('plugin', function() {
    var tmpDir      = path.join(process.cwd(), "tmp"),
        tmpReposDir = path.join(tmpDir, "repos"),
        repoSrc  = path.join(process.cwd(), "test", "repos"),
        repo1Dir = path.join(tmpReposDir, "repo1"),
        repo2Dir = path.join(tmpReposDir, "repo2"),
        repo1,
        repo2;
    
    beforeEach(function() {
      wrench.mkdirSyncRecursive(tmpDir);
      wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, {forceDelete: true});
      repo1 = new Repository(repo1Dir, {watcher:false});
      repo2 = new Repository(repo2Dir, {watcher:false});
    });

    afterEach(function() {
      repo1.destroy();
      repo2.destroy();
      wrench.rmdirSyncRecursive(tmpDir, true);
    });    

    it('should return the named plugin object', function(done) {
      var name = path.join(process.cwd(), "test", "test-plugin");
      repo1.addPlugin(name, {foo:"bar"});
      repo1.saveConfig(function(err) {
        repo1.init(function(err) {
          var plugin = repo1.plugin(name);
          expect(plugin.config).to.be(repo1.config.plugins[name]);
          expect(plugin.repo).to.be(repo1);
          done();
        });
      });
    });
  });
});