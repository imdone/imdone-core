const Plugin = require('imdone-api')
const {getIsoDateWithOffset} = require('../adapters/date-time')
const path = require('path')
const simpleTemplate = `
<!--
created:${timestamp}
-->
`

module.exports = class DefaultCardPropertiesPlugin extends Plugin {
  constructor(project) {
    super(project)
    this.templates = {}
  }

  async onBeforeBoardUpdate() {
    this.templates = await this.getTemplates()
  }

  getCardProperties() {
    const self = this;

    return {
      date: `${getIsoDateWithOffset(new Date()).substring(0, 10)}`,
      timestamp: getIsoDateWithOffset(new Date()),
      clearFilterURL: self.getFilterURL(''),
      templates: this.templates,
      getFilterURL: (filter) => self.getFilterURL(filter),
      getFilterLink: (filter) => `[Filter By: ${filter}](${self.getFilterURL(filter)})`
    }
  }

  getFilterURL(filter) {
    return `imdone://${this.project.path}?filter=${filter}`
  }

  async getTemplates() {
    const { preparePathForWriting, readdir, readFile } = this.project.fileGateway
    const templateDir = path.join(this.project.configDir, 'templates');
    preparePathForWriting(templateDir);
    const files = await readdir(templateDir);
    const readFilePromises = files.map((file) => {
      return new Promise(async (resolve) => {
        const data = await readFile(path.join(templateDir, file), 'utf-8');
        const templateName = file.replace('.md', '').replace(/[^a-zA-Z0-9]/g, '_');
        resolve({ [templateName]: data });
      });
    });

    const allTemplates = await Promise.all(readFilePromises);

    const templates = allTemplates.reduce((acc, template) => {
      return { ...acc, ...template };
    }, {});

    return { simple: simpleTemplate, ...templates };
  }
}
