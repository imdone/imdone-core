const version = require('../lib/version')

module.exports = function () {
  const project = this.project
  return {
    version: version(),
  }
}