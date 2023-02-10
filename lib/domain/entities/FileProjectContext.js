module.exports = class FileProjectContext {
  constructor() {}
  getOrder(list, order) {
    return order ? +order : 0
  }

  getProject() {
    return null
  }
}
