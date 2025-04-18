export default class DefaultBoardActionsPlugin {
    static get pluginName(): string;
    constructor(project: any);
    getBoardActions(): {
        title: string;
        keys: string[];
        icon: string;
        action: (task: any) => any;
    }[];
}
