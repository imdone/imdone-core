'use strict';

// TODO: Build out issues-repo
module.exports = function(repo) {
  this.getIssues = function() {
    return this.issues;
  };

  this.getLists = function() {
    // TODO: Should return a collection of lists containing issues and tasks +issues
  };

  return repo;
};
