const eol = require('eol')

module.exports = function (task) {
  const project = this.project
  return [
    {
      title: `Copy card for code`,
      action: () => {
        const prefix = '// '
        const sep = eol.auto
        const contentLines = task.content.split(sep)

        contentLines[0] = `## ${contentLines[0]}`
        contentLines.splice(
          1,
          0,
          '**code:** [${relPath}:${line}](${relPath}:${line})'
        )

        if (contentLines[contentLines.length - 1].trim() === '')
          contentLines.pop()

        const content = `${prefix}${task.list}:${
          task.order
        } ${contentLines.join(`${sep}${prefix}`)}`

        return project.copyToClipboard(
          content,
          `Card for code copied to clipboard`
        )
      },
      pack: 'fas',
      icon: 'clone',
    },
  ]
}
