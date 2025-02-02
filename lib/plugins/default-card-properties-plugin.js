const Plugin = require('imdone-api')
const {getIsoDateWithOffset} = require('../adapters/date-time')

module.exports = class DefaultCardPropertiesPlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  getCardProperties() {
    const self = this;

    return {
      date: `${getIsoDateWithOffset(new Date()).substring(0, 10)}`,
      timestamp: getIsoDateWithOffset(new Date()),
      getFilterURL: (filter) => self.getFilterURL(filter),
      getFilterLink: (filter) => `[Filter By: ${filter}](${self.getFilterURL(filter)})`
    }
  }

  getFilterURL(filter) {
    return `imdone://${this.project.path}?filter=${filter}`
  }
  
}
