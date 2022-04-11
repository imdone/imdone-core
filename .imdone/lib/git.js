const fs = require('fs')
const path = require('path')
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')

module.exports = function (project) {
  const dir = project.path
  function opts(ext = {}) {
    return {
      fs,
      dir,
      ...ext,
    }
  }
  async function checkout(ref) {
    await git.checkout(opts({ ref }))
  }

  async function branch(ref) {
    await git.branch(opts({ ref }))
  }

  async function currentBranch() {
    return await git.currentBranch(
      opts({
        fullname: false,
      })
    )
  }

  return {
    checkout,
    branch,
    currentBranch,
  }
}
