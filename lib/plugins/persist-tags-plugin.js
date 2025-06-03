import Plugin from 'imdone-api'
import { save } from '../adapters/storage/tags.js'

export default class PersistTagsPlugin extends Plugin {
  
  constructor(project) {
    super(project)
  }

  static get pluginName() {
    return 'PersistTagsPlugin'
  }

  async onBoardUpdate() {
    if (!this.persistTags) {
      return
    }
    await save(this.project.allTags.sort(), this.project.path)
  }

  get persistTags() {
    return this.getSettings()?.persistTags ?? true
  }
}
