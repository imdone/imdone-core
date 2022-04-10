const release = require('./lib/release')

module.exports = function () {
  const project = this.project
  const { getChangeLog, newRelease } = release(project)

  return [
    {
      title: 'Start minor release',
      action: async function () {
        project.toast({ message: 'Creating new minor release' })
        try {
          await newRelease('main', 'minor')
          project.toast({ message: 'Minor release created' })
        } catch (e) {
          console.error('Failed to create new release:', e)
          project.toast({
            message: `Error creating release:${e.message}`,
            type: 'is-danger',
          })
        }
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
