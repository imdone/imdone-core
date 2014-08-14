'use strict';

var _      = require('lodash'),
    crypto = require('crypto'),
    _path  = require('path');

module.exports = {
  /**
   * Description
   * @method userHome
   * @return LogicalExpression
   */
  userHome: function() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  },
  
  /**
   * Description
   * @method user
   * @return LogicalExpression
   */
  user: function() {
    return process.env.USER || process.env.USERNAME;
  },

  /**
   * Description
   * @method cb
   * @param {} cb
   * @return ConditionalExpression
   */
  cb: function(cb) {
    return _.isFunction(cb) ? cb : _.noop;
  },

  /**
   * Description
   * @method sha
   * @param {} data
   * @return CallExpression
   */
  sha: function(data) {
    var shasum = crypto.createHash('sha1');
    shasum.update(data);
    return shasum.digest('hex');
  },

  /**
   * Description
   * @method format
   * @param {} template
   * @param {} col
   * @return CallExpression
   */
  format: function(template, col) {
    col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 2);

    return template.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
        if (m == "{{") { return "{"; }
        if (m == "}}") { return "}"; }
        return col[n];
    });
  },

  readdirSyncRecursive: function(fs, baseDir) {
    baseDir = baseDir.replace(/\/$/, '');

    var readdirSyncRecursive = function(baseDir) {
        var files = [],
            curFiles,
            nextDirs,
            isDir = function(fname){
                return fs.existsSync(_path.join(baseDir, fname)) ? fs.statSync( _path.join(baseDir, fname) ).isDirectory() : false;
            },
            prependBaseDir = function(fname){
                return _path.join(baseDir, fname);
            };

        curFiles = fs.readdirSync(baseDir);
        nextDirs = curFiles.filter(isDir);
        curFiles = curFiles.map(prependBaseDir);

        files = files.concat( curFiles );

        while (nextDirs.length) {
            files = files.concat( readdirSyncRecursive( _path.join(baseDir, nextDirs.shift()) ) );
        }

        return files;
    };

    // convert absolute paths to relative
    var fileList = readdirSyncRecursive(baseDir).map(function(val){
        return _path.relative(baseDir, val);
    });

    return fileList;
  },

  mkdirSyncRecursive: function(fs, path, mode) {
    var self = this;
    path = _path.normalize(path);

    try {
        fs.mkdirSync(path, mode);
    } catch(err) {
        if(err.code == "ENOENT") {
            var slashIdx = path.lastIndexOf(_path.sep);

            if(slashIdx > 0) {
                var parentPath = path.substring(0, slashIdx);
                this.mkdirSyncRecursive(parentPath, mode);
                this.mkdirSyncRecursive(path, mode);
            } else {
                throw err;
            }
        } else if(err.code == "EEXIST") {
            return;
        } else {
            throw err;
        }
    }
  }
};
