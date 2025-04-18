export default class DefaultBoardPropertiesPlugin {
    static get pluginName(): string;
    constructor(project: any);
    templates: {};
    onBeforeBoardUpdate(): Promise<void>;
    getBoardProperties(): Promise<{
        date: string;
        timestamp: string;
        codeSpan: (value: any) => string;
        codeBlock: (value: any, language?: string) => string;
        clearFilterURL: string;
        getFilterURL: (filter: any) => string;
        getFilterLink: (filter: any) => string;
    }>;
    getFilterURL(filter: any): string;
    getTemplates(): Promise<any>;
}
