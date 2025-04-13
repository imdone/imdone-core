import _cloneDeep from 'lodash.clonedeep'
import _path from 'path'
import uniqid from 'uniqid'
import { defaultSettings as _defaultSettings } from './default-settings.js'

export function buildMigrateConfig (repo, defaultSettings = _defaultSettings) {
  const path = repo.path
  return function (config = repo.config) {
    const settings = config.settings
    if (!settings) {
      config.settings = defaultSettings
    }
    if (config && config.settings) {
      const lists = config.lists
        .filter((list) => !list.filter)
        .map((list) => list.name)

      // Set the default journalType
      if (config.settings.appendNewCardsTo && !config.settings.journalType) {
        config.settings.journalType = 'Single File'
      }

      // convert exports to actions
      if (config.settings.exports) {
        config.settings.actions = config.settings.exports
        delete config.settings.exports
      }

      // Make sure all all-caps lists are available in code
      config.lists.forEach((list) => {
        if (
          config.code.include_lists.includes(list.name) ||
          list.name !== list.name.toUpperCase()
        )
          return
        config.code.include_lists.push(list.name)
      })

      if (!config.settings.cards) {
        config.settings.cards = {}
      }
      // metaSep
      if (config.settings.metaSep) {
        config.settings.cards.metaSep = config.settings.metaSep
        delete config.settings.metaSep
      }
      // defaultList
      if (config.settings.defaultList) {
        config.settings.cards.defaultList = config.settings.defaultList
        delete config.settings.defaultList
      }

      if (config.settings.cards.defaultList === undefined) {
        config.settings.cards.defaultList = lists ? lists.find(list => /todo/i.test(list)) :
        lists[0] || '';
      }

      // archiveCompleted
      if (config.settings.cards.archiveCompleted === undefined) {
        config.settings.cards.archiveCompleted = true
      }

      // archiveFolder
      if (config.settings.cards.archiveFolder === undefined) {
        config.settings.cards.archiveFolder = config.settings.journalPath ? _path.join(config.settings.journalPath, 'archive') : 'archive'
      }

      // showTagsAndMeta
      if (config.settings.cards.showTagsAndMeta === undefined) {
        config.settings.cards.showTagsAndMeta = true
      }
      
      if (!repo.listExists(config.settings.cards.defaultList) && lists) {
        config.settings.cards.defaultList = lists[0]
      }

      // taskPrefix (move to cards)
      if (config.settings.taskPrefix) {
        config.settings.cards.taskPrefix = config.settings.taskPrefix
        delete config.settings.taskPrefix
      }
      // maxLines (move to cards)
      if (config.settings.maxLines) {
        config.settings.cards.maxLines = config.settings.maxLines
        delete config.settings.maxLines
      }
      // tagPrefix (move to cards)
      if (config.settings.tagPrefix) {
        config.settings.cards.tagPrefix = config.settings.tagPrefix
        delete config.settings.tagPrefix
      }
      // addCheckBoxTasks (move to cards)
      if (config.settings.addCheckBoxTasks) {
        config.settings.cards.addCheckBoxTasks =
          config.settings.addCheckBoxTasks
        delete config.settings.addCheckBoxTasks
      }
      // addNewCardsToTop (move to cards)
      if (config.settings.addNewCardsToTop) {
        config.settings.cards.addNewCardsToTop =
          config.settings.addNewCardsToTop
        delete config.settings.addNewCardsToTop
      }
      // doneList (move to cards)
      if (config.settings.doneList) {
        config.settings.cards.doneList = config.settings.doneList
        delete config.settings.doneList
      }
      // Set up default doneList
      if (config.settings.cards.doneList === undefined) {
        config.settings.cards.doneList = lists ? lists.find(list => /done/i.test(list)) :
        lists[lists.length - 1] || '';
      }
      // Set up default doingList
      if (config.settings.cards.doingList === undefined) {
        config.settings.cards.doingList = lists ? lists.find(list => /doing|progress/i.test(list)) :
        lists[lists.length - 2] || '';
      }
      // Add name
      if (config.settings.name === undefined) {
        config.settings.name = _path.basename(path)
      }

      // Remove HASH_META_ORDER
      if (config.settings.newCardSyntax && config.settings.newCardSyntax === 'HASH_META_ORDER') {
        config.settings.newCardSyntax = 'HASHTAG'
        config.settings.cards.orderMeta = true
      }

      // Move defaultFilter out of views
      if (config.settings.views && config.settings.views.length > 0) {
        const defaultView = config.settings.views.find(({id}) => id === 'default')
        config.settings.defaultFilter = defaultView ? defaultView.filter : ''
        config.settings.views = config.settings.views.filter(({id}) => id !== 'default')
      }

      // Remove settings.filteredLists
      if (config.settings.filteredLists) {
        delete config.settings.filteredLists
      }

      // make sure all lists have an id
      config.lists.forEach((list) => {
        if (!list.id || (list.id + "").length < 4) list.id = uniqid()
      })

      // Make sure kudosProbability is set
      if (config.settings.kudosProbability === undefined) {
        config.settings.kudosProbability = 0.33
      }

      const defaultCardsSettings = _cloneDeep(defaultSettings.cards)
      const cardsSettings = _cloneDeep(config.settings.cards)

      delete defaultSettings.cards
      delete config.settings.cards

      config.settings = { ...defaultSettings, ...config.settings }
      config.settings.cards = {
        ...defaultCardsSettings,
        ...cardsSettings,
      }
    }
  }
}
