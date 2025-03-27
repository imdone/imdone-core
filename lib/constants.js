import path from 'path'
import { Config } from './config.js'

var DEFAULT_IGNORE_DIRS = `
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

const DEFAULT_IGNORE = `
${DEFAULT_IGNORE_DIRS}
${DEFAULT_IGNORE_EXTS}
`
const CONFIG_DIR = '.imdone'
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const CONFIG_FILE_YML = path.join(CONFIG_DIR, 'config.yml')
const SORT_FILE = path.join(CONFIG_DIR, 'sort.json')
const TEMPLATES_DIR = path.join(CONFIG_DIR, 'templates')
const { JOURNAL_TYPE, DEFAULT_CONFIG } = Config

export const constants = {
  JOURNAL_TYPE,
  ASYNC_LIMIT: 512,
  CONFIG_DIR,
  CONFIG_FILE,
  CONFIG_FILE_YML,
  SORT_FILE,
  TEMPLATES_DIR,
  IGNORE_FILE: '.imdoneignore',
  DEFAULT_FILE_PATTERN: '^(readme\\.md|home\\.md|readme\\.w+|home\\.w+)$',
  DEFAULT_IGNORE,
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_EXTS,
  ERRORS: {
    NOT_A_FILE: 'file must be of type File',
    CALLBACK_REQUIRED: 'Last paramter must be a callback function',
    NO_CONTENT: 'File has no content',
    LIST_NOT_FOUND: 'List not found',
    TASK_NOT_FOUND: 'Task not found',
  },
  DEFAULT_CONFIG,
}
