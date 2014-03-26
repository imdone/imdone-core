var _ = require('lodash');

function Task(obj) {
  if (!(_.isObject(obj))) throw new Error("obj must be an Object");
  this.codeStyle =  obj.codeStyle || false;
  this.text = obj.text;
  this.html = obj.html;
  this.listName = obj.listName;
  this.order = obj.order;
  this.line = obj.line;
  this.id = obj.id;
  this.file = obj.file;
}

module.exports = Task;