const { loadYAML } = require('./adapters/yaml')

const defaultSettingsString = `openIn: default #override
journalType: New File
journalPath: imdone-tasks #override
appendNewCardsTo: imdone-tasks.md
newCardSyntax: HASHTAG #override
replaceSpacesWith: '-' #override
plugins:
  devMode: false
cards:
  colors: [] #override if
  template: | # This is the template for new cards that are created in imdone
    
    
    <!--
    created:\${(new Date()).toISOString()}
    -->
  trackChanges: false #override
  metaNewLine: false #override
  addCompletedMeta: false #override
  addCheckBoxTasks: false #override
  doneList: DONE #override if
  taskPrefix: '##' #override
  tagPrefix: '+' #override
  metaSep: ':' #override
  orderMeta: true
  maxLines: 6 #override
  addNewCardsToTop: true #override
  showTagsAndMeta: true #override
journalTemplate: #override
markdownOnly: false #override
`
module.exports = loadYAML(defaultSettingsString)