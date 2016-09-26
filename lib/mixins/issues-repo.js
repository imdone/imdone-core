'use strict';

// TODO:20 Build out issues-repo
module.exports = function(repo) {
  this.getIssues = function() {
    return this.issues;
  };

  this.getLists = function() {
    // TODO:30 Should return a collection of lists containing issues and tasks +issues
  };

  return repo;
};
