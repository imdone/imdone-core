'use strict';

const _cloneDeep = require('lodash.clonedeep')
const _assign = require('lodash.assign')
const _omit = require('lodash.omit')
const _get = require('lodash.get')


/**
 * Description
 * @method Config
 * @param {} opts
 * @return
 */
function Config(opts) {
  _assign(this, opts);
}

/**
 * Description
 * @method toJSON
 * @return config
 */
Config.prototype.toJSON = function() {
  var config = _cloneDeep(this);
  var self = this;
  config.lists = config.lists.map((list) => {
    return _omit(list, "tasks");
  });

  return config;
};

Config.prototype.includeList = function(name) {
  return this.code 
          && this.code.include_lists 
          && this.code.include_lists.slice
          && this.code.include_lists.includes(name)
};

Config.prototype.ignoreList = function(name) {
  const list = this.lists.find(list => name === list.name)
  return !list || (list && list.ignore)
}

Config.prototype.listExists = function(name) {
  return (this.lists.findIndex(list => list.name === name) > -1);
};

Config.prototype.getDateString = function (date = new Date()) {
  return _get(this, 'settings.cards.useLocalDate') ?  moment(date).utcOffset(0, true).format() : date.toISOString()
}

Config.prototype.getDefaultList = function() {
  return _get(this, 'settings.cards.defaultList', this.lists[0].name)
}

Config.prototype.getDoneList = function() {
  const lists = _cloneDeep(this.lists).reverse()
  return _get(this, 'settings.cards.doneList', lists[0].name)
}

Config.prototype.isAddNewCardsToTop = function() {
  return _get(this, 'settings.cards.addNewCardsToTop', false)
}

Config.prototype.getNewCardSyntax = function() {
  return _get(this, 'settings.newCardSyntax', 'MARKDOWN')
}

Config.prototype.isMetaNewLine = function() {
  return _get(this, 'settings.cards.metaNewLine', false)
}

Config.prototype.getTagPrefix = function() {
  return _get(this, 'settings.cards.tagPrefix', '+')
}

Config.prototype.getTaskPrefix = function() {
  return _get(this, 'settings.cards.taskPrefix', '')
}

Config.prototype.isAddCheckBoxTasks = function() {
  return _get(this, 'settings.cards.addCheckBoxTasks', false)
}

Config.prototype.isAddCompletedMeta = function () {
  return _get(this, 'settings.cards.addCompletedMeta', false)
}

const COLON = ':'
const DOUBLE_COLON = '::'
const META_SEPS = [COLON, DOUBLE_COLON]
Config.prototype.getMetaSep = function() {
  const metaSep = _get(this, 'settings.cards.metaSep', COLON)
  return META_SEPS.includes(metaSep) ? metaSep : COLON
}

module.exports = Config;
