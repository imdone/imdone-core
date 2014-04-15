var _ = require('lodash');

module.exports = {
  userHome: function() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  },
  cb: function(cb) {
    if (_.isFunction(cb)) return cb;
    return _.noop;
  }
};