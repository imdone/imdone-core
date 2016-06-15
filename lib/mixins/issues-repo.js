'use strict';

// TODO:20 Build out issues-repo id:1213 githubClosed:true
module.exports = function(repo) {
  this.getIssues = function() {
    return this.issues;
  };

  this.getLists = function() {
    // TODO:30 Should return a collection of lists containing issues and tasks +issues id:1214
  };

  return repo;
};
