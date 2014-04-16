var _      = require('lodash'),
    crypto = require('crypto');

module.exports = {
  userHome: function() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  },
  
  user: function() {
    return process.env.USER || process.env.USERNAME;
  },

  cb: function(cb) {
    return _.isFunction(cb) ? cb : _.noop;
  },

  sha: function(data) {
    var shasum = crypto.createHash('sha1');
    shasum.update(data);
    return shasum.digest('hex');
  }
};