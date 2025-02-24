const Plugin = require('imdone-api')
const {getIsoDateWithOffset} = require('../adapters/date-time')
const path = require('path')

const simpleTemplate = '\n<!--\ncreated:${timestamp}\n-->\n'

const codeSpan = (value) => '`' + value + '`';
const codeBlock = (value, language = '') => '```' + language + '\n' + value + '\n```';

function flattenObject(object) {
  return Object.keys(object).reduce((acc, key) => {
    return { ...acc, [`template_${key}`]: object[key] };
  }, {});
}

module.exports = class DefaultBoardPropertiesPlugin extends Plugin {
  constructor(project) {
    super(project)
    this.templates = {}
  }

  async onBeforeBoardUpdate() {
    this.templates = await this.getTemplates()
  }

  getBoardProperties() {
    const templates = flattenObject(this.templates);
    const clearFilterURL = this.getFilterURL('');
    const getFilterURL = (filter) => this.getFilterURL(filter);
    const getFilterLink = (filter) => `[Filter By: ${filter}](${this.getFilterURL(filter)})`;
    // TODO Make board properties self documenting
    // <!--
    // #imdone-1.53.16
    // #feature
    // created:2025-02-14T16:54:22-05:00
    // order:-185
    // -->
    // [Feature Description]
    // ## :ballot_box_with_check: Tasks
    // - [ ] Add tasks here
    // ## :white_check_mark: DoD
    // - [ ] Code complete (No Tech Debt)
    // - [ ] Update tests
    // - [ ] Automate what's working
    // - [ ] Update tutorial project
    // - [ ] Update documentation
    // - [ ] Run like a new user and make the experience better
    // - [ ] Make sure the first card is expanded by default or in view mode
    // - [ ] Make sure global and default settings isn't modified when opened for the first time
    return {
      date: `${getIsoDateWithOffset(new Date()).substring(0, 10)}`,
      timestamp: getIsoDateWithOffset(new Date()),
      codeSpan,
      codeBlock,  
      clearFilterURL,
      getFilterURL,
      getFilterLink,
      ...templates
    }
  }

  getFilterURL(filter) {
    return `imdone://${this.project.path}?filter=${filter}`
  }

  // DOING Also include templates (md files) in .github and it's subdirs 
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
