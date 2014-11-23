'use strict';

var _         = require('lodash'),
    crypto    = require('crypto'),
    minimatch = require('minimatch'),
    _path     = require('path');

function mkdirp(fs, path, mode, cb, position) {
  if (_.isFunction(mode)) {
    cb = mode;
    mode = "0777";
  }
  if (!cb) cb = _.noop;

  var parts = _path.normalize(path).split(_path.sep);
  mode = mode || process.umask();
  position = position || 0;

  if (position >= parts.length) {
    return cb();
  }

  var directory = parts.slice(0, position + 1).join(_path.sep) || _path.sep;
  fs.stat(directory, function(err) {    
    if (err === null) {
      mkdirp(fs, path, mode, cb, position + 1);
    } else {
      fs.mkdir(directory, mode, function (err) {
        if (err && err.code != 'EEXIST') {
          return cb(err);
        } else {
          mkdirp(fs, path, mode, cb, position + 1);
        }
      });
    }
  });
}

function readdir(fs, path, ignores, callback) {
  var p = _path;
  if (typeof ignores == 'function') {
    callback = ignores;
    ignores  = [];
  }
  var list = [];

  fs.readdir(path, function (err, files) {
    if (err) {
      return callback(err);
    }

    var pending = files.length;
    if (!pending) {
      // we are done, woop woop
      return callback(null, list);
    }

    var ignoreOpts = {matchBase: true};
    files.forEach(function (file) {
      for (var i = 0; i < ignores.length; i++) {
        if (minimatch(p.join(path, file), ignores[i], ignoreOpts)) {
          pending -= 1;
          if (pending <= 0) {
            callback(null, list);
          }
          return;
        }
      }

      fs.stat(p.join(path, file), function (err, stats) {
        if (err) {
          return callback(err);
        }

        if (stats.isDirectory()) {
          files = readdir(fs, p.join(path, file), ignores, function (err, res) {
            list = list.concat(res);
            pending -= 1;
            if (!pending) {
              callback(null, list);
            }
          });
        }
        else {
          list.push(p.join(path, file));
          pending -= 1;
          if (!pending) {
            callback(null, list);
          }
        }
      });
    });
  });
}


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

  inMixinsNoop: function(cb) {
    cb = this.cb(cb);
    cb(new Error("Implemented in mixins"));
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

  readdirRecursive: readdir,

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
  },

  mkdirp: mkdirp
};
