export default class Repository extends Emitter<[never]> {
    static getTasksByList: typeof getTasksByList;
    static populateFilteredList: typeof populateFilteredList;
    static regexQuery: typeof regexQuery;
    static parseHideListsFromQueryString: typeof parseHideListsFromQueryString;
    static parseSortFromQueryString: typeof parseSortFromQueryString;
    static parseSortFromMongoQuery: typeof parseSortFromMongoQuery;
    static filterCards: typeof filterCards;
    static query: typeof query;
    static replaceDatesInQuery: typeof replaceDatesInQuery;
    static filterObjectValues: typeof filterObjectValues;
    constructor(_path: any, config: any);
    config: any;
    path: any;
    files: any[];
    languages: {
        ".boot": {
            name: string;
            symbol: string;
        };
        ".coffee": {
            name: string;
            symbol: string;
        };
        ".litcoffee": {
            name: string;
            symbol: string;
            literate: boolean;
        };
        Cakefile: {
            name: string;
            symbol: string;
        };
        ".rb": {
            name: string;
            symbol: string;
        };
        ".py": {
            name: string;
            symbol: string;
        };
        ".jl": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".tex": {
            name: string;
            symbol: string;
        };
        ".latex": {
            name: string;
            symbol: string;
        };
        ".swift": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".js": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".es6": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".es": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".ex": {
            name: string;
            symbol: string;
        };
        ".exs": {
            name: string;
            symbol: string;
        };
        ".jsx": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".java": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".properties": {
            name: string;
            symbol: string;
        };
        ".sbt": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".groovy": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".scss": {
            name: string;
            symbol: string;
        };
        ".css": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".cpp": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".cxx": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".cc": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".hpp": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".hxx": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".hh": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".ino": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".php": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".idr": {
            name: string;
            symbol: string;
        };
        ".hs": {
            name: string;
            symbol: string;
        };
        ".lhs": {
            name: string;
            symbol: string;
        };
        ".elm": {
            name: string;
            symbol: string;
        };
        ".erl": {
            name: string;
            symbol: string;
        };
        ".hrl": {
            name: string;
            symbol: string;
        };
        ".less": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".c": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".h": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".m": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".mm": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".m4": {
            name: string;
            symbol: string;
        };
        ".scala": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".cs": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".as": {
            name: string;
            symbol: string;
        };
        ".scpt": {
            name: string;
            symbol: string;
        };
        ".applescript": {
            name: string;
            symbol: string;
        };
        ".sh": {
            name: string;
            symbol: string;
        };
        ".clj": {
            name: string;
            symbol: string;
        };
        ".cljc": {
            name: string;
            symbol: string;
        };
        ".cljs": {
            name: string;
            symbol: string;
        };
        ".cmake": {
            name: string;
            symbol: string;
        };
        ".d": {
            name: string;
            symbol: string;
        };
        ".p": {
            name: string;
            symbol: string;
        };
        ".pp": {
            name: string;
            symbol: string;
        };
        ".pas": {
            name: string;
            symbol: string;
        };
        ".bat": {
            name: string;
            symbol: string;
        };
        ".btm": {
            name: string;
            symbol: string;
        };
        ".cmd": {
            name: string;
            symbol: string;
        };
        ".gms": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".go": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".ini": {
            name: string;
            symbol: string;
        };
        ".lisp": {
            name: string;
            symbol: string;
        };
        ".mel": {
            name: string;
            symbol: string;
        };
        ".pl": {
            name: string;
            symbol: string;
        };
        ".pm": {
            name: string;
            symbol: string;
        };
        ".pod": {
            name: string;
            symbol: string;
        };
        ".t": {
            name: string;
            symbol: string;
        };
        ".pl6": {
            name: string;
            symbol: string;
        };
        ".pm6": {
            name: string;
            symbol: string;
        };
        ".r": {
            name: string;
            symbol: string;
        };
        ".rc": {
            name: string;
            symbol: string;
        };
        ".rs": {
            name: string;
            symbol: string;
        };
        ".sql": {
            name: string;
            symbol: string;
        };
        ".pks": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".pkb": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".vala": {
            name: string;
            symbol: string;
        };
        ".vapi": {
            name: string;
            symbol: string;
        };
        ".vbe": {
            name: string;
            symbol: string;
        };
        ".vbs": {
            name: string;
            symbol: string;
        };
        ".wsc": {
            name: string;
            symbol: string;
        };
        ".wsf": {
            name: string;
            symbol: string;
        };
        ".vhdl": {
            name: string;
            symbol: string;
        };
        ".bas": {
            name: string;
            symbol: string;
        };
        ".ps1": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".lua": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
            };
        };
        ".hx": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".eg": {
            name: string;
            symbol: string;
        };
        ".jade": {
            name: string;
            symbol: string;
        };
        ".pug": {
            name: string;
            symbol: string;
        };
        ".styl": {
            name: string;
            symbol: string;
        };
        ".ts": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".html": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".haml": {
            name: string;
            symbol: string;
        };
        ".yaml": {
            name: string;
            symbol: string;
        };
        ".yml": {
            name: string;
            symbol: string;
        };
        ".cls": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".trigger": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".page": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".component": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".cmp": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".vm": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".vue": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".lock": {
            name: string;
            symbol: string;
        };
        ".re": {
            name: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".kt": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
        ".dart": {
            name: string;
            symbol: string;
            block: {
                start: string;
                end: string;
                ignore: string;
            };
        };
    };
    allMeta: {};
    metaKeys: Set<any>;
    allTags: Set<any>;
    allTopics: Set<any>;
    allContexts: Set<any>;
    init(): void;
    refresh(): Promise<void>;
    /**
     * Description
     * @method destroy
     * @return
     */
    destroy(): Promise<void>;
    destroyed: boolean | undefined;
    /**
     * Description
     * @method getId
     * @return CallExpression
     */
    getId(): any;
    getProject(): any;
    getDisplayName(): string;
    emitFileUpdate(file: any, force: any): void;
    shouldEmitFileUpdate(file: any): true | undefined;
    emitConfigUpdate(data: any): void;
    createListeners(): void;
    taskListener: ((event: any, task: any) => Promise<void>) | undefined;
    taskFoundListener: ((task: any) => void) | undefined;
    taskModifiedListener: ((task: any) => void) | undefined;
    addAllMeta(meta: any): {};
    /**
     * Description
     * @method addList
     * @param {} list
     * @return
     */
    addList(list: any): Promise<void>;
    removeList(list: any): Promise<void>;
    /**
     * Description
     * @method getPath
     * @return MemberExpression
     */
    getPath(): any;
    /**
     * Description
     * @method getConfig
     * @return MemberExpression
     */
    getConfig(): any;
    /**
     * Description
     * @method getLists
     * @return MemberExpression
     */
    getLists(): any;
    getVisibleLists(): any;
    isListVisible(name: any): any;
    /**
     * Description
     * @method setLists
     * @param {} lists
     * @return ThisExpression
     */
    setLists(lists: any): this;
    /**
     * Description
     * @method listExists
     * @param {} name
     * @return BinaryExpression
     */
    listExists(name: any): any;
    /**
     * Save the config file (Implemented in mixins)
     *
     * @method saveConfig
     * @return
     */
    saveConfig(): Promise<void>;
    /**
     * Load the config file (Implemented in mixins)
     *
     * @method loadConfig
     * @return MemberExpression
     */
    loadConfig(): Promise<void>;
    migrateTasksByConfig(oldConfig: any, newConfig: any): Promise<any>;
    /**
     * Get the full path from a relative path
     *
     * @method getFullPath
     * @param {} file
     * @return String
     */
    getFullPath(file: any): any;
    /**
     * Get the relative path from repository root
     *
     * @method getRelativePath
     * @param {} fullPath
     * @return String
     */
    getRelativePath(fullPath: any): any;
    /**
     * Is this file OK?  Implemented in mixins
     *
     * @method fileOK
     * @param {} file
     * @param {} includeDirs
     * @return stat
     */
    fileOK(file: any, includeDirs: any): Promise<void>;
    setIgnores(ignores: any): void;
    ignorePatterns: any;
    ignore: any;
    /**
     * Should the relative path be included.
     *
     * @method shouldInclude
     * @param {} relPath
     * @return exclude
     */
    shouldInclude(relPath: any): boolean;
    /**
     * Add or replace a file in the files reference array
     *
     * @method addFile
     * @param {} file
     * @return MemberExpression
     */
    addFile(file: any): Promise<any[]>;
    /**
     * Remove a file from the files reference array
     *
     * @method removeFile
     * @param {} file
     * @return MemberExpression
     */
    removeFile(file: any): any[];
    /**
     * Description
     * @method getFile
     * @param {} path
     * @return CallExpression
     */
    getFile(path: any): any;
    getTask(id: any): any;
    /**
     * Description
     * @method getFileForTask
     * @param {} task
     * @return CallExpression
     */
    getFileForTask(task: any): any;
    /**
     * Descriptione
     * @method getFiles
     * @param {} paths
     * @return CallExpression
     */
    getFiles(paths: any): any[];
    getFilesWithTasks(): any[];
    resetFile(file: any): void;
    extractTasks(file: any): Promise<any>;
    /**
     * Implemented in mixins
     * @method writeFile
     * @param {} file
     * @param {} cb
     * @return
     */
    writeFile(file: any): Promise<void>;
    /**
     * Implemented in mixins
     * @method getFilesInPath
     * @param {} includeDirs
     * @return CallExpression
     */
    getFilesInPath(includeDirs: any): Promise<void>;
    /**
     * Implemented in mixins
     * @method readFileContent
     * @param {} file
     * @return
     */
    readFileContent(file: any): Promise<void>;
    readFile(file: any): Promise<File>;
    /**
     * Description
     * @method readFiles
     * @param {} files
     * @param {} cb
     * @return
     */
    readFiles(files?: any): Promise<any>;
    /**
     * Implemented in mixins
     * @method deleteFile
     * @param {} path
     * @param {} cb
     * @return
     */
    deleteFile(path: any, cb: any): Promise<void>;
    /**
     * Description
     * @method hasDefaultFile
     * @return CallExpression
     */
    hasDefaultFile(): any;
    /**
     * Description
     * @method getDefaultFile
     * @return file
     */
    getDefaultFile(): any;
    getList(name: any): any;
    getListById(id: any, lists?: any): any;
    hideList(name: any): Promise<void>;
    showList(name: any): Promise<void>;
    setListHidden(name: any, hidden?: boolean): Promise<void>;
    /**
     * Description
     * @method moveList
     * @param {} name
     * @param {} pos
     * @param {} cb
     * @return
     */
    moveList(name: any, pos: any): Promise<void>;
    toggleListIgnore(name: any): Promise<any>;
    toggleList(name: any): Promise<void>;
    updateList(id: any, { name, hidden, ignore, filter }: {
        name: any;
        hidden: any;
        ignore: any;
        filter: any;
    }): Promise<void>;
    getTasksByFile(tasks: any): {};
    moveTasksBetweenLists(oldName: any, newName: any): Promise<any>;
    moving: boolean | undefined;
    writeAndExtract(file: any, emit: any): Promise<any>;
    writeAndAdd(file: any, emit: any): Promise<any>;
    deleteTask(task: any, cb: any): Promise<void>;
    deleteTasks(tasks: any): Promise<void>;
    modifyTaskFromHtml(task: any, html: any): Promise<any>;
    modifyTaskFromContent(task: any, content: any, cb: any): Promise<any>;
    getTaskContent({ description, order, text, taskPrefix, taskSyntax, }: {
        description: any;
        order: any;
        text: any;
        taskPrefix: any;
        taskSyntax: any;
    }): any;
    appendTask({ file, content, list }: {
        file: any;
        content: any;
        list: any;
    }): Promise<{
        file: any;
        task: any;
    }>;
    addTaskToFile(filePath: any, list: any, content: any): Promise<{
        file: any;
        task: any;
    }>;
    /**
     * Description
     * @method modifyTask
     * @param {} task
     * @return CallExpression
     */
    modifyTask(task: any, writeFile?: boolean): Promise<any>;
    moveTask({ task, newList, newPos }: {
        task: any;
        newList: any;
        newPos: any;
    }): Promise<any>;
    moveTasks(tasks: any, newList: any, newPos?: number, noEmit?: boolean): Promise<{
        list: any;
        tasks: any[];
    }[]>;
    lastMovedFiles: void | undefined;
    getModifiedFiles(): any[];
    saveModifiedFiles(): Promise<void>;
    savingFiles: boolean | undefined;
    /**
     * Description
     * @method getTasks
     * @return tasks
     */
    getTasks(): any[];
    getTasksByList(noSort: any): any;
    /**
     * Description
     * @method getTasksInList
     * @param {} name
     * @return ConditionalExpression
     */
    getTasksInList(name: any, offset: any, limit: any): any[];
    getTaskIndex(task: any): number;
    query(queryString: any): any;
}
import Emitter from 'events';
import File from './file.js';
declare function getTasksByList(repo: any, tasksAry: any, noSort: any, populateFiltered: any): any;
declare function populateFilteredList(list: any, tasks: any): void;
declare function regexQuery(tasks: any, queryString: any): any;
declare function parseHideListsFromQueryString(queryString: any): {
    hideLists: any[];
    queryString: any;
};
declare function parseSortFromQueryString(queryString: any): {
    sort: any[];
    queryString: any;
};
declare function parseSortFromMongoQuery(mongoQuery: any): ({
    asc: string;
    desc?: undefined;
} | {
    desc: string;
    asc?: undefined;
})[];
declare function filterCards(tasks: any, _queryString?: string): {
    result: any[];
    query: any;
    sort: any[];
    hideLists: any[];
};
declare function query(tasks: any, queryString: any): any[];
declare function replaceDatesInQuery(query: any): any;
declare function filterObjectValues(o: any, cb: any): any;
export {};
