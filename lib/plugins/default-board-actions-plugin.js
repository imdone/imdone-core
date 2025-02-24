const Plugin = require('imdone-api')

module.exports = class DefaultBoardActionsPlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  getBoardActions() {
    const project = this.project
    const isWindows = process.platform === 'win32'
    const openIn = isWindows ? 'Explorer' : 'Finder'

    return [
      {
        title: 'Duplicate card',
        keys: ['shift+d'],
        icon: 'clone',
        action: async (task) => {
          const timestamp = project.isoDateWithOffset
          await project.newCard({
            list: project.config.getDefaultList(),
            path: task.relPath,
            template: task.content.replace(/(\screated:).*(\s)/, `$1${timestamp}$2`),
          })
          project.toast({ message: `"${task.text}" duplicated` })
        },
      },
      {
        title: 'Copy card to clipboard',
        keys: ['c'],
        icon: 'clone',
        action: (task) => {
          return project.copyToClipboard(task.content, `"${task.text} markdown" copied to clipboard`)
        },
      },
      {
        title: 'Copy card title to clipboard',
        keys: ['mod+t'],
        icon: 'clone',
        action: (task) => {
          const title = project.renderMarkdown(task.text, task.fullPath).replaceAll(/<\/*p>/gi, '')
          return project.copyToClipboard(title, `"${title}" copied to clipboard`)
        },
      },
      {
        title: `Open in ${openIn}`,
        keys: ['alt+shift+o'],
        icon: "folder",
        async action () {
          await project.openPath(project.path)
        }
      }  
    ]
  }
  
}
