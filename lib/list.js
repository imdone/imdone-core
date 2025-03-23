import uniqid from 'uniqid';

/**
 * Description
 * @method List
 * @param {} name
 * @param {} hidden
 * @return
 */
export default class List {
  constructor({ name, hidden, ignore, filter, id }) {
    this.name = name;
    this.hidden = hidden || false
    this.ignore = ignore || false
    this.id = id || uniqid()
    if (filter) this.filter = filter
    this.tasks = [];
  }

  static isList(list) {
    return list instanceof List;
  };

  isHidden() {
    return this.hidden;
  };

  getName() {
    return this.name;
  };

  getTasks() {
    return this.tasks;
  };

  addTask(task) {
    if (!this.tasks.find(_task => _task.equals(task))) {
      this.tasks.push(task);
    }
  };

  setTasks(tasks) {
    this.tasks = tasks;
  };

  hasTasks() {
    return this.tasks.length > 0;
  };

  toConfig() {
    const list = { ...this }
    delete list.tasks
    if (list.filter == null) delete list.filter
    return list
  };
}