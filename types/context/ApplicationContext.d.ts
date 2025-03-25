export function appContext(): ApplicationContext;
declare class ApplicationContext {
    constructor({ project, repo, projectContext, projectReader, projectPresenter, }: {
        project: any;
        repo: any;
        projectContext: any;
        projectReader: any;
        projectPresenter: any;
    });
    project: any;
    repo: any;
    projectContext: any;
    projectReader: any;
    projectPresenter: any;
    innerConfig: Config;
    pluginRegistry: {
        getAvailablePlugins: typeof getAvailablePlugins;
    };
    set config(config: any);
    get config(): any;
}
import { Config } from '../config.js';
import { getAvailablePlugins } from '../plugins/plugin-registry.js';
export {};
