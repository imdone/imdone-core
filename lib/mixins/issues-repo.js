'use strict';

// TODO: Build out issues-repo, a way to integrate issues that don't have TODO comments.  Only works if there's a kanban approach.
module.exports = function(repo) {
  this.getIssues = function() {
    return this.issues;
  };

  this.getLists = function() {
    // TODO: Should return a collection of lists containing issues and tasks +issues
  };

  return repo;
};
