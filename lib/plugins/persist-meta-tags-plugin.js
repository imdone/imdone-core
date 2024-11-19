const Plugin = require('imdone-api')

module.exports = class PersistMetaTagsPlugin extends Plugin {
  constructor(project) {
    super(project)
    console.log('loading persist-meta-tags-plugin')
  }

  onBoardUpdate() {

  }
  
  // DOING Write meta and tags to `.imdone/meta.yaml` file
  // <!--
  // order:0
  // sid:AV9EjMgpjevJY4dInnWan
  // -->
  async saveMeta() {
    console.log('Saving meta')
  }
}
