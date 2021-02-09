'use strict';
var path = require('path');

// var DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build|dist|logs|flow-typed|imdone-export\.json)[\\/\\\\]?|\\.(git|svn|hg|npmignore)|\\~$|\\.(jpg|png|gif|swp|ttf|otf|pdf)$";
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
`
var DEFAULT_IGNORE_EXTS = `
*.jpg
*.png
*.gif
*.swp
*.ttf
*.odf
*.pdf
*.doc
*.xls
`

var DEFAULT_IGNORE = `
${DEFAULT_IGNORE_DIRS}
${DEFAULT_IGNORE_EXTS}
`
var CONFIG_DIR = ".imdone";
module.exports = {
  ASYNC_LIMIT: 512,
  CONFIG_DIR,
  CONFIG_FILE: path.join(CONFIG_DIR,"config.json"),
  CONFIG_FILE_YML: path.join(CONFIG_DIR,"config.yml"),
  SORT_FILE: path.join(CONFIG_DIR, 'sort.json'),
  TEMPLATES_DIR: path.join(CONFIG_DIR,'templates'),
  IGNORE_FILE: '.imdoneignore',
  DEFAULT_FILE_PATTERN: "^(readme\\.md|home\\.md|readme\\.\w+|home\\.\w+)$",
  DEFAULT_IGNORE,
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_EXTS,
  ERRORS: {
    NOT_A_FILE: "file must be of type File",
    CALLBACK_REQUIRED: "Last paramter must be a callback function",
    NO_CONTENT: "File has no content"
  },
  DEFAULT_CONFIG: {
    keepEmptyPriority: false,
    code: {
      include_lists:[
        "TODO", "DOING", "DONE", "PLANNING", "FIXME", "ARCHIVE", "HACK", "CHANGED", "XXX", "IDEA", "NOTE", "REVIEW"
      ]
    },
    lists: [
      {
        "hidden": false,
        "name": "TODO"
      },
      {
        "hidden": false,
        "name": "DOING"
      },
      {
        "hidden": false,
        "name": "DONE"
      }
    ]
  }
};
