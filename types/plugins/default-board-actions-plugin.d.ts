export default class DefaultBoardActionsPlugin {
    constructor(project: any);
    getBoardActions(): {
        title: string;
        keys: string[];
        icon: string;
        action: (task: any) => any;
    }[];
}
