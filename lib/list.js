function List(name, hidden) {
  this.name = name;
  this.hidden = hidden || false;
  this.tasks = [];
}

List.isList = function(list) {
  return list instanceof List;
};

List.prototype.isHidden = function() {
  return this.hidden;
};

List.prototype.getName = function() {
  return this.name;
};

List.prototype.getTasks = function() {
  return this.tasks;
};

List.prototype.addTask = function(task) {
  this.tasks.push(task);
};

List.prototype.setTasks = function(tasks) {
  this.tasks = tasks;
};

List.prototype.hasTasks = function() {
  return this.tasks.length > 0; 
};

module.exports = List;