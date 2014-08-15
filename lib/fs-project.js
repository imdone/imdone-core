'use strict';

var _      = require('lodash'),
    events = require('events'),
    fs     = require('fs'),
    async  = require('async'),
    util   = require('util'),
    tools  = require('./tools'),
    Config = require('./config'),
    Project = require('./project');

var DEFAULT_CONFIG = { lists: [] };

/**
 * Description
 * @method Project
 * @param {} owner
 * @param {} name
 * @param {} repos
 * @return 
 */
function FSProject(owner, name, repos) {
  Project.call(this, owner, name, repos);
  
  if (!fs.existsSync(this.configBase) || !fs.statSync(this.configBase).isDirectory())
    throw new Error("IMDONE_CONFIG_DIR must be an existing directory on the file system");
}

util.inherits(FSProject, Project);

FSProject.prototype.loadConfig = function() {
  var file = this.getConfigFile();
  var configLike = {};
  if (fs.existsSync(file)) {
    var configLikeContent = fs.readFileSync(file);
    try {
      configLike = JSON.parse(configLikeContent.toString());
    } catch (e) {}
  }

  _.defaults(configLike, _.cloneDeep(DEFAULT_CONFIG));
  this.config = new Config(configLike);

  return this.config;
};

FSProject.prototype.saveConfig = function(cb) {
  var self = this;
  if (cb === undefined) cb = _.noop;
  // Only store config if there is more than one Repo
  if (this.getRepos().length === 1) return cb();
  var dir = this.getConfigDir();
  var file = this.getConfigFile();
  
  fs.exists(dir, function(exists) {
    try {
      if (!exists) {
        tools.mkdirSyncRecursive(fs, dir);
      }
      fs.writeFile(file, JSON.stringify(self.getConfig(), null, 2), cb);
    } catch(e) {
      console.log("Error saving config " + file);
      cb();
    }
  });
};

module.exports = FSProject;
