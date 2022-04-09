const release = require('./lib/release')
const path = require('path')
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const fs = require('fs')

module.exports = function () {
  const project = this.project
  const { getChangeLog } = release(project)

  return [
    {
      title: 'Start release',
      action: async function () {
        await git.checkout({
          fs,
          dir: project.path,
          ref: 'master',
        })
      },
    },
    {
      title: 'Copy changelog',
      action: function () {
        project.copyToClipboard(
          getChangeLog(true).join('\n'),
          'Changelog copied'
        )
      },
    },
  ]
}
