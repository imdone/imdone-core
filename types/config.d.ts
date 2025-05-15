export class Config {
    static DEFAULT_CONFIG: {
        keepEmptyPriority: boolean;
        code: {
            include_lists: string[];
        };
        lists: {
            hidden: boolean;
            name: string;
        }[];
    };
    static JOURNAL_TYPE: {
        SINGLE_FILE: string;
        FOLDER: string;
        NEW_FILE: string;
    };
    static newDefaultConfig(config?: {}): Config;
    constructor(opts: any);
    settings: {};
    get cards(): any;
    set defaultFilter(filter: any);
    get defaultFilter(): any;
    set name(name: any);
    get name(): any;
    includeList(name: any): any;
    ignoreList(name: any): any;
    listExists(name: any): boolean;
    getDefaultList(): any;
    getDoneList(): any;
    getDoingList(): any;
    isAddNewCardsToTop(): any;
    getNewCardSyntax(): any;
    isMetaNewLine(): any;
    getTagPrefix(): any;
    getCommentTagsOnly(): any;
    getTaskPrefix(): any;
    isAddCheckBoxTasks(): any;
    isAddCompletedMeta(): any;
    set customCardTerminator(terminator: any);
    get customCardTerminator(): any;
    get markdownOnly(): any;
    get views(): any;
    get appendNewCardsTo(): any;
    get ignoreFrontMatter(): any;
    get ignoreFrontMatterTags(): any;
    set journalPath(path: any);
    get journalPath(): any;
    get journalTemplate(): any;
    get journalType(): any;
    get journalFilePrefix(): any;
    get journalFileSuffix(): any;
    get replaceSpacesWith(): any;
    get devMode(): any;
    get plugins(): any;
    get orderMeta(): any;
    get maxLines(): any;
    get archiveFolder(): any;
    get archiveCompleted(): any;
    get tokenPrefix(): any;
    get doneList(): any;
    getMetaSep(): any;
}
