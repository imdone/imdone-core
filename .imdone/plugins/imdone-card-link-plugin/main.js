import Plugin from 'imdone-api'
import { nanoid } from 'nanoid'

export default class CardLinkPlugin extends Plugin {
  
  constructor (project) {
    super(project)
  }

  getCardActions (task) {
    const project = this.project
    const actions = [
      {
        title: 'Copy card markdown link to clipboard',
        action: () => {
          let sid = task.meta.sid && task.meta.sid[0]
          if (!sid) {
            sid = nanoid()
            project.addMetadata(task, 'sid', sid)
          }
          const url = `imdone://card.select/${project.path}?sid=${sid}`
          const link = `[${task.text}](${url})`
          return project.copyToClipboard(
            link,
            `Card markdown link copied to clipboard`
          )
        },
        icon: 'clone',
        pack: 'fas'
      }
    ]
    return actions
  }

}
