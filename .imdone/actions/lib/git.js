const fs = require('fs')
const path = require('path')
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')

module.exports = function (project) {
  async function checkout(ref) {
    await git.checkout({
      fs,
      dir: project.path,
      ref,
    })
  }

  async function branch(ref) {
    await git.branch({
      fs,
      dir: project.path,
      ref,
    })
  }

  return {
    checkout,
    branch,
  }
}
