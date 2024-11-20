const Plugin = require('imdone-api')
const { save } = require('../adapters/storage/tags.js')

module.exports = class PersistTagsPlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  async onBoardUpdate() {
    await save(this.project.allTags, this.project.path)
  }
  
}
