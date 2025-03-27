import Plugin from 'imdone-api'
import { getIsoDateWithOffset } from '../adapters/date-time.js'
import path from 'path'

const simpleTemplate = '\n<!--\ncreated:${timestamp}\n-->\n'

const codeSpan = (value) => '`' + value + '`';
const codeBlock = (value, language = '') => '```' + language + '\n' + value + '\n```';

function flattenObject(object) {
  return Object.keys(object).reduce((acc, key) => {
    return { ...acc, [`template_${key}`]: object[key] };
  }, {});
}

export default class DefaultBoardPropertiesPlugin extends Plugin {
  constructor(project) {
    super(project)
    this.templates = {}
  }

  async onBeforeBoardUpdate() {
    this.templates = await this.getTemplates()
  }

  async getBoardProperties() {
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
    filter = filter.replace(/\(/g, '%28').replace(/\)/g, '%29');
    return encodeURI(`imdone://${this.project.path}?filter=${filter}`)
  }


  async getTemplates() {
    const { preparePathForWriting, readdir, readFile, stat, exists } = this.project.fileGateway;
    const templateDir = path.join(this.project.configDir, 'templates');
    const githubDir = path.join(this.project.path, '.github');

    await preparePathForWriting(templateDir);

    const readMarkdownFiles = async (dir, prefix = '') => {
      const files = await readdir(dir);
      const readFilePromises = files.map(async (file) => {
        const filePath = path.join(dir, file);
        const fileStat = await stat(filePath);
        if (fileStat && fileStat.isDirectory()) {
          return readMarkdownFiles(filePath, `${prefix}${file}_`);
        } else if (file.endsWith('.md')) {
          const data = await readFile(filePath, 'utf-8');
          const templateName = `${prefix}${file.replace('.md', '').replace(/[^a-zA-Z0-9]/g, '_')}`;
          return { [templateName]: data };
        }
        return {};
      });

      const allTemplates = await Promise.all(readFilePromises);
      return allTemplates.reduce((acc, template) => ({ ...acc, ...template }), {});
    };

    const templatesFromTemplateDir = await readMarkdownFiles(templateDir);
    const templatesFromGithubDir = await exists(githubDir)
      ? await readMarkdownFiles(githubDir, 'github_')
      : {};

    return { simple: simpleTemplate, ...templatesFromTemplateDir, ...templatesFromGithubDir };
  }
}
