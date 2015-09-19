'use strict';
var path = require('path');

// #ARCHIVE:0 Eliminate unused config options
var DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build|dist|logs)[\\/\\\\]?|\\.(git|svn|hg|npmignore)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$";
var CONFIG_DIR = ".imdone";
module.exports = {
  CONFIG_DIR: CONFIG_DIR,
  CONFIG_FILE: path.join(CONFIG_DIR,"config.json"),
  IGNORE_FILE: '.imdoneignore',
  DEFAULT_FILE_PATTERN: "^(readme\\.md|home\\.md)$",
  DEFAULT_EXCLUDE_PATTERN: DEFAULT_EXCLUDE_PATTERN,
  DEFAULT_CONFIG: {
    exclude: [DEFAULT_EXCLUDE_PATTERN],
    watcher: true,
    code: {
      include_lists:[
        "TODO", "DOING", "DONE", "PLANNING", "FIXME", "ARCHIVE", "HACK", "CHANGED", "XXX", "IDEA", "NOTE", "REVIEW"
      ]
    },
    lists: [],
    marked : {
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      smartLists: true,
      langPrefix: 'language-' }
  },
  ERRORS: {
    NOT_A_FILE: "file must be of type File",
    CALLBACK_REQUIRED: "Last paramter must be a callback function"
  }
};
