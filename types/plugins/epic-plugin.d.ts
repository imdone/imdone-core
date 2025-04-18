export default class EpicPlugin {
    static get pluginName(): string;
    constructor(project: any);
    epics: {};
    onBeforeBoardUpdate(): Promise<void>;
    onBoardUpdate(lists: any): void;
    onTaskUpdate(task: any): void;
    initEpic(name: any): void;
    addEpic(name: any, task: any): void;
    addEpicItem(name: any, task: any): void;
    get epicNames(): string[];
    getEpic(name: any): any;
    getEpicItems(name: any): any;
    getEpicItemsInList(name: any, list: any): any;
    getEpicLists(name: any): string[];
    isListHidden(name: any, lists: any): any;
    isListIgnored(name: any, lists: any): any;
    updateCardMD(lists: any): void;
    getTaskListMD(lists: any, epicFilter: any, epicUrl: any, epicId: any): string;
}
