'use strict';

var DEFAULT_EXCLUDE_PATTERN = "^(node_modules|bower_components|\\.imdone|target|build|dist)[\\/\\\\]?|\\.(git|svn|hg|npmignore)|\\~$|\\.(jpg|png|gif|swp|ttf|otf)$";
module.exports = {
  DEFAULT_FILE_PATTERN: "^(readme\\.md|home\\.md)$",
  DEFAULT_EXCLUDE_PATTERN: DEFAULT_EXCLUDE_PATTERN,
  DEFAULT_CONFIG: { 
    exclude: [DEFAULT_EXCLUDE_PATTERN],
    watcher: true,
    code: {
      include_lists:["TODO", "DOING", "DONE", "PLANNING", "FIXME", "ARCHIVE"]
    },
    lists: [],
    marked : { 
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: true,
      smartLists: true,
      langPrefix: 'language-' }
  },
  ERRORS: { 
    NOT_A_FILE: "file must be of type File",
    CALLBACK_REQUIRED: "Last paramter must be a callback function"
  }
};