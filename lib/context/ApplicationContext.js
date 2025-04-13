import { Config } from '../config.js'
import { getAvailablePlugins } from '../plugins/plugin-registry.js';

class ApplicationContext {
  constructor({
    project,
    repo,
    projectContext,
    projectReader,
    projectPresenter,
  }) {
    this.project = project;
    this.repo = repo;
    this.projectContext = projectContext;
    this.projectReader = projectReader;
    this.projectPresenter = projectPresenter;
    this.innerConfig = Config.newDefaultConfig()
    this.pluginRegistry = { getAvailablePlugins }
  }

  set config(config) {
    this.innerConfig = config 
    this.repo && (this.repo.config = config)
  }

  get config() {
    return this.repo?.config ?? this.innerConfig
  }

}
const context = new ApplicationContext({})

export function appContext() {
  return context
}