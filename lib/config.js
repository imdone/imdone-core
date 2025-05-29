/**
 * Description
 * @method Config
 * @param {} opts
 * @return
 */
const COLON = ':'
const DOUBLE_COLON = '::'
const META_SEPS = [COLON, DOUBLE_COLON]

const JOURNAL_TYPE = {
  SINGLE_FILE: 'Single File',
  FOLDER: 'Folder',
  NEW_FILE: 'New File',
}

const DEFAULT_CONFIG = {
  keepEmptyPriority: false,
  code: {
    include_lists: [
      'TODO',
      'DOING',
      'DONE',
      'PLANNING',
      'FIXME',
      'ARCHIVE',
      'HACK',
      'CHANGED',
      'XXX',
      'IDEA',
      'NOTE',
      'REVIEW',
    ],
  },
  lists: [
    {
      hidden: false,
      name: 'TODO',
    },
    {
      hidden: false,
      name: 'DOING',
    },
    {
      hidden: false,
      name: 'DONE',
    },
  ],
}

export class Config {
  constructor(opts) {
    Object.assign(this, opts)
    if (!this.settings) this.settings = {}
    if (!this.settings.views) this.settings.views = []
    if (!this.settings.cards) this.settings.cards = {}
  }

  static DEFAULT_CONFIG = DEFAULT_CONFIG
  static JOURNAL_TYPE = JOURNAL_TYPE
  
  static newDefaultConfig(config = {}) {
    return new Config(
      {
        ...DEFAULT_CONFIG, 
        lists: [
          ...DEFAULT_CONFIG.lists
        ],
        ...config
      }
    )
  } 

  get cards () {
    return this?.settings?.cards
  }

  get defaultFilter() {
    return this?.settings?.defaultFilter ?? ''
  }

  set defaultFilter(filter) {
    this.settings.defaultFilter = filter
  }

  get name() {
    return this?.settings?.name ?? ''
  }

  set name(name) {
    this.settings.name = name
  }

  includeList(name) {
    return this?.code?.include_lists?.includes(name)
  }

  ignoreList(name) {
    const list = this?.lists?.find((list) => name === list.name)
    return !list || (list && list.ignore)
  }

  listExists(name) {
    return this?.lists?.findIndex((list) => list.name === name) > -1
  }

  getDefaultList() {
    return  this?.cards?.defaultList ?? this.lists[0].name
  }

  getDoneList() {
    const lists = structuredClone(this.lists).reverse().filter((list) => !list.filter)
    return this?.cards?.doneList
    || lists?.find(list => /dene|completed|finished/i.test(list?.name ?? ''))?.name 
    || lists[0]?.name
    || ''
}

  getDoingList() {
    const lists = structuredClone(this.lists).filter((list) => !list.filter)
    .reverse()
    return this?.cards?.doingList 
      || lists?.find(list => /doing|progress/i.test(list?.name ?? ''))?.name 
      || lists[1]?.name
      || ''
  }

  isAddNewCardsToTop() {
    return this?.cards?.addNewCardsToTop ?? false
  }

  getNewCardSyntax() {
    return this?.settings?.newCardSyntax?? 'MARKDOWN'
  }

  isMetaNewLine() {
    return this?.cards?.metaNewLine ?? false
  }

  getTagPrefix() {
    return this?.cards?.tagPrefix ?? '+'
  }

  getCommentTagsOnly() {
    return this?.cards?.commentTagsOnly ?? false
  }

  getCommentMetaOnly() {
    return this?.cards?.commentMetaOnly ?? false
  }

  getTaskPrefix() {
    return this?.cards?.taskPrefix ?? '##'
  }

  isAddCheckBoxTasks() {
    return this?.cards?.addCheckBoxTasks ?? false
  }

  isAddCompletedMeta() {
    return this?.cards?.addCompletedMeta ?? false
  }

  get customCardTerminator() {
    return this?.cards?.customCardTerminator
  }

  set customCardTerminator(terminator) {
    this.settings.cards.customCardTerminator = terminator
  }

  get markdownOnly() {
    return this?.settings?.markdownOnly
  }

  get views() {
    return this?.settings?.views
  }

  get appendNewCardsTo() {
    return this?.settings?.appendNewCardsTo ?? false
  }

  get ignoreFrontMatter() {
    return this?.settings?.ignoreFrontMatter ?? false
  }

  get ignoreFrontMatterTags() {
    return this?.settings?.ignoreFrontMatterTags ?? false
  }

  get journalPath() {
    return this?.settings?.journalPath ?? ''
  }

  set journalPath(path) {
    this.settings.journalPath = path
  }

  get journalTemplate() {
    const template = this?.settings?.journalTemplate ?? ''
    return template === 'null' ? '' : template || ''
  }

  get journalType() {
    return this?.settings?.journalType ?? JOURNAL_TYPE.FOLDER
  }

  get journalFilePrefix() {
    return this?.settings?.journalFilePrefix ?? ''
  }

  get journalFileSuffix() {
    return this?.settings?.journalFileSuffix ?? ''
  }

  get replaceSpacesWith() {
    return this?.settings?.replaceSpacesWith
  }

  get devMode() {
    return this?.settings?.plugins?.devMode ?? false
  }

  get plugins() {
    return this?.settings?.plugins ?? { devMode: this.devMode }
  }

  get orderMeta() {
    return this?.cards?.orderMeta ?? false
  }

  get maxLines() {
    return this?.cards?.maxLines ?? 1
  }

  get archiveFolder() {
    return this?.cards?.archiveFolder ?? 'archive'
  }

  get archiveCompleted() {
    return this?.cards?.archiveCompleted ?? false
  }

  get tokenPrefix() {
    return this?.cards?.tokenPrefix ?? '#'
  }

  get doneList() {
    return this.getDoneList()
  }

  getMetaSep() {
    const metaSep = this?.cards?.metaSep ?? COLON
    return META_SEPS.includes(metaSep) ? metaSep : COLON
  }
}
