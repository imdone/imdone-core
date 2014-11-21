'use strict';

var _       = require('lodash'),
    events  = require('events'),
    fs      = require('fs'),
    async   = require('async'),
    path    = require('path'),
    util    = require('util'),
    tools   = require('../tools'),
    Config  = require('../config'),
    log     = require('debug')('imdone-mixins:project-fs-store');

var CONFIG_DIR     = ".imdone",
    CONFIG_FILE    = "config.json",
    DEFAULT_CONFIG = { lists: [] };

module.exports = mixin;

function mixin(proj, configBase, fs) {
  if (arguments.length === 0) throw new Error("Project is required.");
  if (arguments.length === 2) {
    if (!_.isString(configBase)) fs = configBase; configBase = undefined;
  }
  
  fs = fs || require('fs');

  proj.configBase = configBase || process.env.IMDONE_CONFIG_DIR || tools.userHome();

  if (!fs.existsSync(proj.configBase) || !fs.statSync(proj.configBase).isDirectory())
    throw new Error("IMDONE_CONFIG_DIR must be an existing directory on the file system");

  var init = proj.init;

  proj.init = function(cb) {
    fs.exists(proj.configBase, function(exists) {
      if (!exists) return cb(new Error("configBase must be an existing directory on the file system"));
      fs.stat(proj.configBase, function(err, stat) {
        if (err) return cb(err);
        if (!stat.isDirectory()) return cb(new Error("configBase must be an existing directory on the file system"));
        proj.loadConfig(function(err, config) {
          if (err) return cb(err);
          init.call(proj, cb);
        });
      });
    });
  };

  proj.getConfigDir = function() {
    return path.join(proj.configBase, CONFIG_DIR, proj.getName().replace(" ", "_")); 
  };

  proj.getConfigFile = function() {
    return path.join(proj.getConfigDir(), CONFIG_FILE);
  };

  proj.loadConfig = function(cb) {
    cb = tools.cb(cb);
    var file = proj.getConfigFile();
    var configLike = {};
    fs.exists(file, function(exists) {
      if (!exists) {
        proj.config = new Config(DEFAULT_CONFIG);
        return cb(null, proj.config);
      }

      fs.readFile(file, function(err, configLikeContent) {
        if (err) return cb(err);
        configLike = JSON.parse(configLikeContent.toString());
        _.defaults(configLike, _.cloneDeep(DEFAULT_CONFIG));
        proj.config = new Config(configLike);
        cb(null, proj.config);
      });
    });
  };

  proj.saveConfig = function(cb) {
    cb = tools.cb(cb);
    // Only store config if there is more than one Repo
    if (proj.getRepos().length === 1) return cb();
    var dir = proj.getConfigDir();
    var file = proj.getConfigFile();
    
    fs.exists(dir, function(exists) {
      if (!exists) {
        tools.mkdirp(fs, dir, function(err) {
          if (err) return cb(err);
          fs.writeFile(file, JSON.stringify(proj.getConfig(), null, 2), cb);
        });
      } else fs.writeFile(file, JSON.stringify(proj.getConfig(), null, 2), cb);
    });
  };

  return proj;

}