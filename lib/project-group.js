var Project = require('./project');

function ProjectGroup(owner, name) {
  this.owner = owner;
  this.name = name;
  this.projects = [];
}

ProjectGroup.prototype.addProject = function(owner, name, repos) {
  this.projects.push(new Project(owner, name, repos));
};

module.exports = ProjectGroup;