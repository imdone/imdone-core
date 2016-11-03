'use strict';

var _         = require('lodash'),
    crypto    = require('crypto'),
    _path     = require('path'),
    max_bytes = 512;

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

function isBinaryCheck(bytes, size) {
  if (size === 0)
    return false;

  var suspicious_bytes = 0;
  var total_bytes = Math.min(size, max_bytes);

  if (size >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) {
    // UTF-8 BOM. This isn't binary.
    return false;
  }

  for (var i = 0; i < total_bytes; i++) {
    if (bytes[i] === 0) { // NULL byte--it's binary!
      return true;
    }
    else if ((bytes[i] < 7 || bytes[i] > 14) && (bytes[i] < 32 || bytes[i] > 127)) {
      // UTF-8 detection
      if (bytes[i] > 191 && bytes[i] < 224 && i + 1 < total_bytes) {
          i++;
          if (bytes[i] < 192) {
              continue;
          }
      }
      else if (bytes[i] > 223 && bytes[i] < 239 && i + 2 < total_bytes) {
          i++;
          if (bytes[i] < 192 && bytes[i + 1] < 192) {
              i++;
              continue;
          }
      }
      suspicious_bytes++;
      // Read at least 32 bytes before making a decision
      if (i > 32 && (suspicious_bytes * 100) / total_bytes > 10) {
          return true;
      }
    }
  }

  if ((suspicious_bytes * 100) / total_bytes > 10) {
    return true;
  }

  return false;
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

  isBinaryFile: function(fs, file, callback) {

    fs.exists(file, function (exists) {
      if (!exists) return callback(null, false);

      fs.open(file, 'r', function(err, descriptor){
          if (err) return callback(err);
          var bytes = new Buffer(max_bytes);
          // Read the file with no encoding for raw buffer access.
          fs.read(descriptor, bytes, 0, bytes.length, 0, function(err, size, bytes){
            fs.close(descriptor, function(err2){
                if (err || err2)
                    return callback(err || err2);
                return callback(null, isBinaryCheck(bytes, size));
            });
          });
      });
    });
  },

  isBinaryCheck: isBinaryCheck,

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
  },

  mkdirp: mkdirp
};
