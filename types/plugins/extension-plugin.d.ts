export default class ExtensionPlugin {
    static get pluginName(): string;
    constructor(project: any);
    configDir: string;
    init(): Promise<void>;
    cardActionsFunction: any;
    boardActionsFunction: any;
    cardPropertiesFunction: any;
    boardPropertiesFunction: any;
    getCardProperties(task: any): any;
    getBoardProperties(): Promise<any>;
    getCardActions(task: any): any;
    getBoardActions(): any;
    getExtensionPath(relativePath: any): string;
    loadExtensionModule(_default: any, ...path: any[]): Promise<any>;
}
