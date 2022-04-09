const release = require('./lib/release')

module.exports = function () {
  const project = this.project
  const { getChangeLog } = release(project)

  return [
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
