module.exports = {
  ChangesExistError: class extends Error {
    constructor(action) {
      super(`There are changes on the current branch.  Please commit or stash them before you ${action}.`)
      this.name = "ChangesExistError"
    }
  }
}