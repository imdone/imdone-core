const wrench = require('wrench')
const path = require('path')
const tmpDir = path.join(__dirname, '..', 'tmp')
const tmpReposDir = path.join(tmpDir, "repos")
const repoSrc  = path.join(__dirname, "repos")
const repoDir = path.join(tmpReposDir, "repo2")

module.exports = {
  getFreshRepo: function () {
    wrench.rmdirSyncRecursive(tmpDir, true)
    wrench.mkdirSyncRecursive(tmpDir)
    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, {forceDelete: true})
    return repoDir
  }
}
