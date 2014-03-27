var should = require('should'), 
    expect = require('expect.js'),
    sinon  = require('sinon'),
    Repository = require('../lib/repository'),
    File       = require('../lib/file'),
    util   = require('util'),
    fs     = require('fs'),
    wrench = require('wrench'),
    async  = require('async');


/* 

var Repository = require('./repository');
var repo = new Repository('/home/jesse/projects/imdone-core/test/files');
repo.init();

*/

var repo = new Repository(process.cwd() + "/test/files");
var configDir = repo.getPath() + "/.imdone";

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
      var file = new File("test.md","[Add some content](#DONE:0)");
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

  describe("hasDefaultFile", function() {
    it("Should return false if no default file exists", function() {
      repo.init(function(err, files) {
        expect(repo.hasDefaultFile()).to.be(false);
      });
    });

    it("Should return true if readme.md file exists", function(done) {
      repo.init(function(err, files) {
        var file = new File("reADmE.md","[Add some content](#DONE:0)");
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
        var file = new File("hOmE.Md","[Add some content](#DONE:0)");
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
        var file = new File("reADmE.md","[Add some content](#DONE:0)");
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
        var file = new File("hOmE.Md","[Add some content](#DONE:0)");
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
        var home = new File("hOmE.Md","[Add some content](#DONE:0)");
        var readme = new File("reADmE.Md","[Add some content](#DONE:0)");
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
    it("Should load the config file", function() {
      repo.config.foo = "bar";
      repo.saveConfig();
      expect(fs.existsSync(configDir)).to.be(true);
      repo.loadConfig();
      expect(repo.config.foo).to.be("bar");
      wrench.rmdirSyncRecursive(configDir, true);
      expect(fs.existsSync(configDir)).to.be(false);
    });
  });
});