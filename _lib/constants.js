'use strict'
var path = require('path')

var DEFAULT_IGNORE_PATHS = `
node_modules
bower_components
target
build
dist*
logs
flow-typed
.git
.svn
.hs
.npmignore
.obsidian
.imdone/templates
`
var DEFAULT_IGNORE_EXTS = `
*.jpg
*.png
*.gif
*.swp
*.ttf
*.odf
*.pdf
*.doc*
*.xls*
*.ppt*
*.pps*
*.ppa*
*.pot*
`

var DEFAULT_IGNORE = `
${DEFAULT_IGNORE_PATHS}
${DEFAULT_IGNORE_EXTS}
`
var CONFIG_DIR = '.imdone'
module.exports = {
  JOURNAL_TYPE: {
    SINGLE_FILE: 'Single File',
    FOLDER: 'Folder',
    NEW_FILE: 'New File',
  },
  ASYNC_LIMIT: 512,
  CONFIG_DIR,
  CONFIG_FILE: path.join(CONFIG_DIR, 'config.json'),
  CONFIG_FILE_YML: path.join(CONFIG_DIR, 'config.yml'),
  SORT_FILE: path.join(CONFIG_DIR, 'sort.json'),
  TEMPLATES_DIR: path.join(CONFIG_DIR, 'templates'),
  IGNORE_FILE: '.imdoneignore',
  DEFAULT_FILE_PATTERN: '^(readme\\.md|home\\.md|readme\\.w+|home\\.w+)$',
  DEFAULT_IGNORE,
  DEFAULT_IGNORE_PATHS,
  DEFAULT_IGNORE_EXTS,
  ERRORS: {
    NOT_A_FILE: 'file must be of type File',
    CALLBACK_REQUIRED: 'Last paramter must be a callback function',
    NO_CONTENT: 'File has no content',
    LIST_NOT_FOUND: 'List not found',
    TASK_NOT_FOUND: 'Task not found',
  },
  DEFAULT_CONFIG: {
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
  },
}
