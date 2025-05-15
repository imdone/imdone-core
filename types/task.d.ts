/**
 * Description
 * @method Task
 * @param {} obj
 * @return
 */
export class Task {
    static addToLastCommentInContent(content: any, toAdd: any, newLine: any): string;
    static DATE_META_KEYS: string[];
    static hasCheckPrefix(content: any): boolean;
    static padDescription(description?: any[], beforeText?: string): any[];
    static trimDescription(rawTaskContentLines: any, beforeText: any): any;
    static Types: {
        CODE: string;
        HASHTAG: string;
        MARKDOWN: string;
    };
    static AnyLanguageGroup: string;
    static EmojiGroup: string;
    static getTagRegexp(prefix?: string): RegExp;
    static getTags(text: any, prefix?: string, commentTagsOnly?: boolean): string[];
    static getMarkdownLinkLabelPositions(text: any): {
        start: number;
        end: number;
    }[];
    static isResultInMarkdownLinkLabel(linkLabelPositions: any, index: any): any;
    static getCommentPositions(text: any): {
        start: number;
        end: number;
    }[];
    static isResultInComment(commentPositions: any, index: any): any;
    static ContextRegExp: RegExp;
    static getContext(text: any): string[];
    static MetaRegExp: RegExp;
    static getMetaRegExp(config: any): RegExp;
    static getMetaRegExpQuotes(config: any): RegExp;
    static parseMetaData(config: any, content: any): {};
    static getMetaData(config: any, task: any): {};
    static execMetaRegex(re: any, content: any, codePositions: any, cb: any): void;
    static eachMetaInContent(config: any, content: any, cb: any): void;
    static hasWindowsEOL(content: any): boolean;
    static getLinePos(content: any, lineNo: any): any;
    static getLineNumber(content: any, pos: any): number;
    static getMetaOrderRegex(config: any): RegExp;
    /**
     * Description
     * @method isTask
     * @param {} task
     * @return BinaryExpression
     */
    static isTask(task: any): task is Task;
    static getMarkdownCodePositions(text: any): {
        start: number;
        end: number;
    }[];
    static isResultInMarkdownCode(positions: any, index: any): boolean;
    static removeTags(text: any, prefix?: string): any;
    static removeContext(text: any): any;
    static removeMetaDataFromText(config: any, text: any): any;
    static removeMetaData({ config, content, key, value }: {
        config: any;
        content: any;
        key: any;
        value: any;
    }): any;
    constructor(config: any, obj: any, dontParse: any);
    frontMatter: any;
    pos: any;
    rawTask: any;
    beforeText: any;
    text: any;
    list: any;
    set order(val: any);
    get order(): any;
    hasColon: any;
    line: any;
    id: any;
    repoId: any;
    source: any;
    type: any;
    tags: any;
    context: any;
    meta: any;
    metaIndex: any;
    inBlockComment: any;
    singleLineBlockComment: any;
    description: any;
    rawTaskContentLines: any;
    taskStartOnLine: any;
    commentStartOnLine: any;
    descriptionStartsWith: any;
    filteredListName: any;
    isWrappedWithCardTag: any;
    config: any;
    allMeta: any;
    allContext: any;
    allTags: any;
    progress: any;
    content: any;
    lastLine: any;
    orderModified: any;
    index: any;
    innerOrder: any;
    get descriptionString(): any;
    updateLastLine(): void;
    getLastLine(): any;
    parse(): void;
    paddingLength: number | undefined;
    metaKeys: string[] | undefined;
    topics: string[] | undefined;
    issueNumberRegExp(): RegExp;
    get listId(): any;
    get path(): any;
    get markdownBeforeText(): string;
    getTextAndDescription(): any;
    getRawTextAndDescription(): any;
    getProgress(): {
        completed: any;
        total: any;
    };
    getContent(): any;
    updateContent(): void;
    updateFromContent(content: any): void;
    toJSON(): this & {
        allTags: any;
        allContext: any;
        allMeta: any;
        config: undefined;
        expand: boolean;
    };
    getTagPrefix(): any;
    getCommentTagsOnly(): any;
    addToLastCommentInContent(content: any, toAdd: any, newLine: any): string;
    getCheckedData(): {
        pad: number;
        checked: boolean;
    } | null;
    updateOrderMeta(config: any, descContent?: any): undefined;
    replaceContent(regex: any, replacement: any): void;
    replaceMetaSep(oldMetaSep: any, newMetaSep: any): void;
    updateContext(): void;
    parseTodoTxt(): void;
    getTags(): any[];
    getContext(): any[];
    getDueMeta(): any;
    getMetaData(): any;
    getListTrackingMeta(lists: any): any[];
    hasListChanged(lists: any): boolean;
    hasMetaData(key: any, value: any): any;
    /**
     * Returns metadata as list with links
     * @method getMetaDataWithLinks
     * @param {} repository config
     * @return Array
     */
    getMetaDataWithLinks(config: any): any[];
    getMetaLink(config: any, metaKey: any, metaValue: any): {
        title: string;
        url: string;
        icon: any;
    } | undefined;
    toString(): string;
    /**
     * Description
     * @method getRepoId
     * @return MemberExpression
     */
    getRepoId(): any;
    /**
     * Description
     * @method getSource
     * @return MemberExpression
     */
    getSource(): any;
    /**
     * Description
     * @method getId
     * @return MemberExpression
     */
    getId(): any;
    /**
     * Description
     * @method getList
     * @return MemberExpression
     */
    getList(): any;
    /**
     * Description
     * @method getText
     * @return text
     */
    getText(opts: any, text: any): any;
    getChecksFromHtml(html: any): boolean[];
    /**
     * Description
     * @method getLine
     * @return MemberExpression
     */
    getLine(): any;
    getType(): any;
    /**
     * Description
     * @method equals
     * @param {} task
     * @return LogicalExpression
     */
    equals(task: any): boolean | undefined;
}
