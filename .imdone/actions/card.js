const eol = require('eol')

module.exports = function (task) {
  const project = this.project
  const actions = [
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
  const epic =
    (task.meta['is-epic'] && task.meta['is-epic'][0]) ||
    (task.meta.epic && task.meta.epic[0])
  if (epic && task.source.path.endsWith('.md')) {
    const template = `
    <!--
    epic:"${epic}"
    created:${new Date().toISOString()}
    -->`.replace(/  +/g, '')
    actions.push({
      title: `Add a card to ${epic}`,
      action: () => {
        project.newCard({
          list: 'TODO',
          path: task.source.path,
          template,
        })
        return true
      },
      pack: 'fas',
      icon: 'plus',
    })
  }
  return actions
}
