export default class PersistTagsPlugin {
    static get pluginName(): string;
    constructor(project: any);
    onBoardUpdate(): Promise<void>;
}
