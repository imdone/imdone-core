'use strict';

var _       = require('lodash'),
    events  = require('events'),
    fs      = require('fs'),
    async   = require('async'),
    util    = require('util'),
    tools   = require('../tools'),
    Config  = require('../config'),
    log     = require('debug')('imdone-mixins:project-fs-store');

var DEFAULT_CONFIG = { lists: [] };

module.exports = mixin;

function mixin(proj) {
  if (!fs.existsSync(proj.configBase) || !fs.statSync(proj.configBase).isDirectory())
    throw new Error("IMDONE_CONFIG_DIR must be an existing directory on the file system");

  var init = proj.init;

  proj.init = function(cb) {
    proj.loadConfig(function(err, config) {
      if (err) return cb(err);
      init.call(proj, cb);
    });
  };

  proj.loadConfig = function(cb) {
    cb = tools.cb(cb);
    var file = proj.getConfigFile();
    var configLike = {};
    fs.exists(file, function(exists) {
      if (!exists) return cb(new Error("Can't find config file:" + file));
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
      try {
        if (!exists) {
          tools.mkdirp(fs, dir);
        }
        fs.writeFile(file, JSON.stringify(proj.getConfig(), null, 2), cb);
      } catch(e) {
        console.log("Error saving config " + file);
        cb(e);
      }
    });
  };

  return proj;

}