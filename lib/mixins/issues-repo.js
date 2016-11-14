'use strict';

// TODO: Build out issues-repo id:8
module.exports = function(repo) {
  this.getIssues = function() {
    return this.issues;
  };

  this.getLists = function() {
    // TODO: Should return a collection of lists containing issues and tasks +issues id:9
  };

  return repo;
};
