export default class ArchivePlugin {
    constructor(project: any);
    get config(): any;
    get fileGateway(): any;
    onBeforeBoardUpdate(): Promise<void>;
    archivingTasks: boolean | undefined;
    archiveTask(task: any, config?: any): Promise<void>;
}
