import Plugin from 'imdone-api'
import { save } from '../adapters/storage/tags.js'

export default class PersistTagsPlugin extends Plugin {
  
  constructor(project) {
    super(project)
  }

  async onBoardUpdate() {
    await save(this.project.allTags.sort(), this.project.path)
  }
  
}
