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

module.exports = Config;