'use strict';

// TODO:10 Build out issues-repo
module.exports = function(repo) {
  this.getIssues = function() {
    return this.issues;
  };

  this.getLists = function() {
    // TODO:20 Should return a collection of lists containing issues and tasks +issues
  };

  return repo;
};
