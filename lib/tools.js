var _      = require('lodash'),
    crypto = require('crypto');

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
  }
};