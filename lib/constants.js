'use strict';
var path = require('path');

var DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build|dist|logs|flow-typed|imdone-export\.json)[\\/\\\\]?|\\.(git|svn|hg|npmignore)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$";
var CONFIG_DIR = ".imdone";
module.exports = {
  ASYNC_LIMIT: 512,
  CONFIG_DIR: CONFIG_DIR,
  CONFIG_FILE: path.join(CONFIG_DIR,"config.json"),
  SORT_FILE: path.join(CONFIG_DIR, 'sort.json'),
  TEMPLATES_DIR: path.join(CONFIG_DIR,'templates'),
  IGNORE_FILE: '.imdoneignore',
  DEFAULT_FILE_PATTERN: "^(readme\\.md|home\\.md|readme\\.\w+|home\\.\w+)$",
  DEFAULT_EXCLUDE_PATTERN: DEFAULT_EXCLUDE_PATTERN,
  DEFAULT_CONFIG: {
    exclude: [DEFAULT_EXCLUDE_PATTERN],
    watcher: true,
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
  },
  ERRORS: {
    NOT_A_FILE: "file must be of type File",
    CALLBACK_REQUIRED: "Last paramter must be a callback function",
    NO_CONTENT: "File has no content"
  }
};
