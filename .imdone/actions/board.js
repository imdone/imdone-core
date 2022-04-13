const release = require('../lib/release')
const { runTests } = require('../lib/test')
const exec = require('child_process').exec

async function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (stderr) console.warn('cmd stderr:', stderr)
      if (error) return reject(error)
      resolve(stdout)
    })
  })
}

module.exports = function () {
  const project = this.project
  const { getChangeLog, startRelease, isCurrentVersionBranch, version } =
    release(project)
  const actions = ['patch', 'minor', 'major'].map((increment) => {
    return {
      title: `Start release ${version.update(increment)}`,
      action: function () {
        startRelease('master', increment)
      },
    }
  })

  actions.push({
    title: 'Run tests',
    action: async function () {
      project.toast({ message: `Running tests for ${project.name}` })
      const result = await runTests(project)
      const message = `Test results: passed:${result.pass} failed:${result.fail}`
      console.log(message)
      project.toast({ message })
    },
  })

  actions.push({
    title: 'Copy changelog',
    action: function () {
      project.copyToClipboard(getChangeLog(true).join('\n'), 'Changelog copied')
    },
  })

  return actions
}
