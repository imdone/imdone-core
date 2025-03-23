export default function _default(): ApplicationContext;
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
        getAvailablePlugins: () => Promise<any>;
    };
    set config(config: any);
    get config(): any;
}
import { Config } from '../config.js';
export {};
