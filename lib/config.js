'use strict';

var _ = require('lodash');

/**
 * Description
 * @method Config
 * @param {} opts
 * @return
 */
function Config(opts) {
  _.assign(this, opts);
}

/**
 * Description
 * @method toJSON
 * @return config
 */
Config.prototype.toJSON = function() {
  var config = _.cloneDeep(this);
  var self = this;
  config.lists = _.map(config.lists, function(list) {
    return _.omit(list, "tasks");
  });

  return config;
};

Config.prototype.includeList = function(name) {
  if (this.code && this.code.include_lists && this.code.include_lists.slice) {
    return _.contains(this.code.include_lists, name);
  }
  return true;
};

Config.prototype.ignoreList = function(name) {
  const list = _.find(this.lists, {name})
  return list && list.ignore
}

Config.prototype.listExists = function(name) {
  return (_.findIndex(this.lists, { name: name }) > -1);
};

module.exports = Config;
