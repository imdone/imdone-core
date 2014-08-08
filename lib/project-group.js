'use strict';

var Project = require('./project');

/**
 * Description
 * @method ProjectGroup
 * @param {} owner
 * @param {} name
 * @return 
 */
function ProjectGroup(owner, name) {
  if (arguments.length < 2) throw new Error("owner and name are required");

  this.owner = owner;
  this.name = name;
  this.projects = [];
}

/**
 * Description
 * @method addProject
 * @param {} owner
 * @param {} name
 * @param {} repos
 * @return 
 */
ProjectGroup.prototype.addProject = function(owner, name, repos) {
  if (arguments.length < 3) {
    owner = this.owner;
    name = arguments[0];
    repos = arguments[1];
  }
  
  this.projects.push(new Project(owner, name, repos));
};

module.exports = ProjectGroup;