const release = require('../lib/release')

module.exports = function () {
  const project = this.project
  const { getChangeLog, startRelease, prepareRelease, version } =
    release(project)
  const actions = ['patch', 'minor', 'major'].map((increment) => {
    return {
      title: `Start release ${version.update(increment)}`,
      action: async function () {
        await startRelease('master', increment)
      },
    }
  })

  actions.push({
    title: `Release ${project.name} ${version.get()}`,
    action: async function () {
      await prepareRelease(project)
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
