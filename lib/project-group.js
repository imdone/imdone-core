var Project = require('./project');

function ProjectGroup(owner, name) {
  if (arguments.length < 2) throw new Error("owner and name are required");

  this.owner = owner;
  this.name = name;
  this.projects = [];
}

ProjectGroup.prototype.addProject = function(owner, name, repos) {
  if (arguments.length < 3) {
    owner = this.owner;
    name = arguments[0];
    repos = arguments[1];
  }
  
  this.projects.push(new Project(owner, name, repos));
};

module.exports = ProjectGroup;