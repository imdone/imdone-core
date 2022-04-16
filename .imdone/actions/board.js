const release = require('../lib/release')

module.exports = function () {
  const project = this.project
  const { startRelease, prepareRelease, version } = release(project)
  const actions = ['patch', 'minor', 'major'].map((increment) => {
    return {
      title: `Start release ${version.update(increment)}`,
      action: async function () {
        await startRelease('master', increment)
      },
    }
  })

  actions.push({
    title: `Prepare Pull Request ${project.name} ${version.get()}`,
    action: async function () {
      await prepareRelease(project)
    },
  })

  return actions
}
