export class WorkerProject {
    constructor(repo: any);
    repo: any;
    innerFilter: string;
    fileGateway: typeof fileGateway;
    _updatedAt: Date | undefined;
    data: {};
    dataKeys: any[];
    pluginManager: PluginManager;
    get configDir(): string;
    get allTopics(): any[];
    get allTags(): any[];
    get allContexts(): any[];
    get allMeta(): any;
    get lists(): any;
    get allLists(): any;
    get filteredCards(): any[];
    get isoDateWithOffset(): string;
    get updatedAt(): Date | undefined;
    get files(): any;
    get config(): any;
    set defaultFilter(filter: any);
    get defaultFilter(): any;
    get totals(): {};
    get path(): any;
    get name(): any;
    get doneList(): any;
    get boardActions(): any[];
    set filter(filter: string);
    get filter(): string;
    init(): Promise<any>;
    initIndexes(allLists: any): void;
    toJSON(): {
        path: any;
    };
    getListsForImdoneJSON(): {
        allLists: any;
        totals: {};
    };
    getInitializedCards(allLists: any, totals: any): any;
    toImdoneJSON(): Promise<{
        path: any;
        config: any;
        lists: any;
        files: any;
        totals: {};
        totalCards: any;
        tags: any[];
        allMeta: any;
        allContexts: any[];
        allTags: any[];
        filter: string;
        defaultFilter: any;
        actions: any[];
        plugins: any[];
        data: {};
        dataKeys: string[];
        queryProps: any[];
    }>;
    dataKays: string[] | undefined;
    getRequestedLists(cards: any): any;
    emit(): void;
    emitUpdate(): void;
    destroy(): Promise<void>;
    getDataKeys(data: any): string[];
    removeList(list: any): void;
    getLists(opts: any): any;
    getTaskQueryProps(props: any): any[];
    getQueryProps(cards: any): any[];
    getTags(cards?: any[]): any[];
    getDefaultFilteredCards(): any[];
    getAllCards(filter: any): any[];
    getCards(filter: any, cards?: any[]): any[];
    filterCards(cards: any, filter: any): any[];
    hideLists: any[] | undefined;
    addMetadata(task: any, key: any, value: any): Promise<any>;
    removeMetadata(task: any, key: any, value: any): Promise<any>;
    addTag(task: any, tag: any): Promise<any>;
    removeTag(task: any, tag: any): Promise<any>;
    moveTask(task: any, newList: any, newPos: any): Promise<any>;
    getFile(filePath: any): any;
    getFileForTask(task: any): any;
    rollBackFileForTask(task: any): any;
    updateCardContent(task: any, content: any): Promise<any>;
    snackBar({ message, type, duration }: {
        message: any;
        type: any;
        duration: any;
    }): Promise<void>;
    toast({ message, type, duration }: {
        message: any;
        type: any;
        duration: any;
    }): Promise<void>;
    filterLists(filter: any, lists?: any): any;
    copyToClipboard(text: any, message: any): Promise<void>;
    openUrl(url: any): Promise<void>;
    openPath(path: any): Promise<void>;
    saveFile(content: any, file: any): void;
    newCard({ list, path, template, title, comments, emit }: {
        list: any;
        path: any;
        template: any;
        title: any;
        comments: any;
        emit?: boolean | undefined;
    }): Promise<{
        list: any;
        path: any;
        relativePath: string;
        template: any;
        isDirectory: any;
    }>;
    addCardToFile(opts: any): Promise<any>;
    addTaskToFile({ path, list, content, tags, contexts, meta, useCardTemplate }: {
        path: any;
        list?: any;
        content: any;
        tags?: never[] | undefined;
        contexts?: never[] | undefined;
        meta?: never[] | undefined;
        useCardTemplate?: boolean | undefined;
    }): Promise<any>;
    addMetaToContent(meta: any, content: any): any;
    addContextsToContent(contexts: any, content: any): any;
    addTagsToContent(tags: any, content: any): any;
    deleteTask(task: any): Promise<void>;
    deleteTasks(tasks: any): Promise<void>;
    setFilter(filter: any): void;
    getNewCardTemplate(file: any, isFile: any): Promise<any>;
    getNewCardFileFrontMatter(file: any, isFile: any): Promise<{
        props: any;
        computed: any;
        template: any;
    }>;
    getNewCardsFile(opts?: {
        relPath: boolean;
    }): string;
    appendNewCardsTo(title: any): string | undefined;
    sanitizeFileName(fileName: any): any;
    getJournalFile(): {
        filePath: string;
        fullFilePath: string;
    };
    getFullPath(...path: any[]): string;
    performCardAction(action: any, task: any): any;
    performBoardAction(action: any, task: any): Promise<any>;
    exec(cmd: any): Promise<any>;
    installPlugin({ name, version }: {
        name: any;
        version: any;
    }): Promise<void>;
    uninstallPlugin(name: any): Promise<void>;
    refresh(): Promise<void>;
    renderMarkdown(content: any, filePath: any): any;
    extractWikilinkTopics(markdown: any): string[];
}
import * as fileGateway from './adapters/file-gateway.js';
import { PluginManager } from './plugins/plugin-manager.js';
