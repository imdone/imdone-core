const { loadYAML } = require("./tools")

const defaultSettingsString = `openIn: default #override
customOpenIn: '' #override
editorTheme: blackboard
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
journalTemplate: #override
theme: 'dark'
`
module.exports = loadYAML(defaultSettingsString)