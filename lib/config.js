'use strict';

const _cloneDeep = require('lodash.clonedeep')
const _assign = require('lodash.assign')
const _get = require('lodash.get')

/**
 * Description
 * @method Config
 * @param {} opts
 * @return
 */
const COLON = ':'
const DOUBLE_COLON = '::'
const META_SEPS = [COLON, DOUBLE_COLON]

class Config {
  constructor (opts) {
    _assign(this, opts);
    const defaultView = this.views.find(view => view.id === 'default')
    if (!defaultView) {
      if (!this.settings) this.settings = {}
      if (!this.settings.views) this.settings.views = []
      this.settings.views.push({
        id: 'default',
        filter: ''
      })
    }
  }

  get views () {
    return (this.settings && this.settings.views) || []
  }
  
  get defaultFilter () {
    return this.views.find(({id}) => id === 'default').filter
  }
  
  includeList (name) {
    return this.code 
            && this.code.include_lists 
            && this.code.include_lists.slice
            && this.code.include_lists.includes(name)
  };
  
  ignoreList (name) {
    const list = this.lists.find(list => name === list.name)
    return !list || (list && list.ignore)
  }
  
  listExists (name) {
    return (this.lists.findIndex(list => list.name === name) > -1);
  };
  
  getDateString  (date = new Date()) {
    return _get(this, 'settings.cards.useLocalDate') ?  moment(date).utcOffset(0, true).format() : date.toISOString()
  }
  
  getDefaultList () {
    return _get(this, 'settings.cards.defaultList', this.lists[0].name)
  }
  
  getDoneList () {
    const lists = _cloneDeep(this.lists).reverse()
    return _get(this, 'settings.cards.doneList', lists[0].name)
  }
  
  isAddNewCardsToTop () {
    return _get(this, 'settings.cards.addNewCardsToTop', false)
  }
  
  getNewCardSyntax () {
    return _get(this, 'settings.newCardSyntax', 'MARKDOWN')
  }
  
  isMetaNewLine () {
    return _get(this, 'settings.cards.metaNewLine', false)
  }
  
  getTagPrefix () {
    return _get(this, 'settings.cards.tagPrefix', '+')
  }
  
  getTaskPrefix () {
    return _get(this, 'settings.cards.taskPrefix', '')
  }
  
  isAddCheckBoxTasks () {
    return _get(this, 'settings.cards.addCheckBoxTasks', false)
  }
  
  isAddCompletedMeta  () {
    return _get(this, 'settings.cards.addCompletedMeta', false)
  }

  get ignoreFrontMatter () {
    return _get(this, 'settings.ignoreFrontMatter', false)
  }

  get ignoreFrontMatterTags () {
    return _get(this, 'settings.ignoreFrontMatterTags', false)
  }
  
  getMetaSep () {
    const metaSep = _get(this, 'settings.cards.metaSep', COLON)
    return META_SEPS.includes(metaSep) ? metaSep : COLON
  }
}

module.exports = Config;
