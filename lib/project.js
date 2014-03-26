function Project(owner, name, repos) {
  this.owner = owner;
  this.name = name;
  this.repos = repos;
  this.lists = [];
}

module.exports = Project;