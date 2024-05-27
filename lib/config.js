'use strict'

const _cloneDeep = require('lodash.clonedeep')
const _assign = require('lodash.assign')
const _get = require('lodash.get')
const { JOURNAL_TYPE, DEFAULT_CONFIG } = require('./constants')

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
  constructor(opts) {
    _assign(this, opts)
    if (!this.settings) this.settings = {}
    if (!this.settings.views) this.settings.views = []
  }

  get defaultFilter() {
    return _get(this, 'settings.defaultFilter', '')
  }

  set defaultFilter(filter) {
    this.settings.defaultFilter = filter
  }

  get name() {
    _get(this, 'settings.name', '')
  }

  set name(name) {
    this.settings.name = name
  }

  includeList(name) {
    return (
      this.code &&
      this.code.include_lists &&
      this.code.include_lists.slice &&
      this.code.include_lists.includes(name)
    )
  }

  ignoreList(name) {
    const list = this.lists.find((list) => name === list.name)
    return !list || (list && list.ignore)
  }

  listExists(name) {
    return this.lists.findIndex((list) => list.name === name) > -1
  }

  getDefaultList() {
    return _get(this, 'settings.cards.defaultList', this.lists[0].name)
  }

  getDoneList() {
    const lists = _cloneDeep(this.lists).reverse().filter((list) => !list.filter)
    const defaultValue = lists && lists.length ? lists[0].name : undefined
    return _get(this, 'settings.cards.doneList', defaultValue)
  }

  isAddNewCardsToTop() {
    return _get(this, 'settings.cards.addNewCardsToTop', false)
  }

  getNewCardSyntax() {
    return _get(this, 'settings.newCardSyntax', 'MARKDOWN')
  }

  isMetaNewLine() {
    return _get(this, 'settings.cards.metaNewLine', false)
  }

  getTagPrefix() {
    return _get(this, 'settings.cards.tagPrefix', '+')
  }

  getTaskPrefix() {
    return _get(this, 'settings.cards.taskPrefix', '')
  }

  isAddCheckBoxTasks() {
    return _get(this, 'settings.cards.addCheckBoxTasks', false)
  }

  isAddCompletedMeta() {
    return _get(this, 'settings.cards.addCompletedMeta', false)
  }

  get noDST() {
    return _get(this, 'settings.noDST', false)
  }

  get markdownOnly() {
    return this.settings.markdownOnly
  }

  get views() {
    return this.settings.views
  }

  get cardActions() {
    return [..._get(this, 'settings.cards.links', [])]
  }

  get boardActions() {
    const settingsActions = _get(this, 'settings.actions', []).map((action) => {
      return { name: action.name, action: action['function'] }
    })
    return [...settingsActions]
  }

  get appendNewCardsTo() {
    return _get(this, 'settings.appendNewCardsTo', false)
  }

  get ignoreFrontMatter() {
    return _get(this, 'settings.ignoreFrontMatter', false)
  }

  get ignoreFrontMatterTags() {
    return _get(this, 'settings.ignoreFrontMatterTags', false)
  }

  get journalPath() {
    return _get(this, 'settings.journalPath', '')
  }

  set journalPath(path) {
    this.settings.journalPath = path
  }

  get journalTemplate() {
    const template = _get(this, 'settings.journalTemplate', '')
    return template === 'null' ? '' : template || ''
  }

  get journalType() {
    return _get(this, 'settings.journalType', JOURNAL_TYPE.FOLDER)
  }

  get journalFilePrefix() {
    return _get(this, 'settings.journalFilePrefix', '')
  }

  get journalFileSuffix() {
    return _get(this, 'settings.journalFileSuffix', '')
  }

  get replaceSpacesWith() {
    return _get(this, 'settings.replaceSpacesWith')
  }

  get devMode() {
    return _get(this, 'settings.plugins.devMode', false)
  }

  get plugins() {
    return _get(this, 'settings.plugins', { devMode: false })
  }

  get orderMeta() {
    return _get(this, 'settings.cards.orderMeta', false)
  }

  get maxLines() {
    return _get(this, 'settings.cards.maxLines', 1)
  }

  get blankLinesToEndTask() {
    let blankLinesToEndTask = Math.round(
      _get(this, 'settings.cards.blankLinesToEndTask', 1)
    )
    if (blankLinesToEndTask > 2) {
      blankLinesToEndTask = 2
    } else if (blankLinesToEndTask < 1) {
      blankLinesToEndTask = 1
    }
    return blankLinesToEndTask
  }

  getMetaSep() {
    const metaSep = _get(this, 'settings.cards.metaSep', COLON)
    return META_SEPS.includes(metaSep) ? metaSep : COLON
  }
}

Config.newDefaultConfig = (config = {}) => new Config({...DEFAULT_CONFIG, lists: [...DEFAULT_CONFIG.lists], ...config})
module.exports = Config
