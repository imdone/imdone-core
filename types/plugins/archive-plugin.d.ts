export default class ArchivePlugin {
    static get pluginName(): string;
    constructor(project: any);
    get config(): any;
    get fileGateway(): any;
    onBeforeBoardUpdate(): Promise<void>;
    archivingTasks: boolean | undefined;
    archiveTask(task: any, config?: any): Promise<void>;
}
