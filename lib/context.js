const innerRepo = null
module.exports = {
  setRepo (repo) {
    innerRepo = repo
  },
  getConfig () {
    return innerRepo.config
  }
}