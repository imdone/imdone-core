const release = require('./lib/release')

module.exports = function () {
  const project = this.project
  const { getChangeLog, startRelease, version } = release(project)

  return [
    {
      title: `Start release ${version.update('patch')}`,
      action: function () {
        startRelease('master', 'patch')
      },
    },
    {
      title: `Start release ${version.update('minor')}`,
      action: function () {
        startRelease('master', 'minor')
      },
    },
    {
      title: `Start release ${version.update('major')}`,
      action: function () {
        startRelease('master', 'major')
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
