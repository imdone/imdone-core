export function newCard(task: any, _project: any, dontParse: any): {
    readonly settings: any;
    readonly maxLines: any;
    interpretedContent: any;
    innerInterpretedContent: any;
    init(totals?: any): /*elided*/ any;
    totals: any;
    onTaskUpdate(): void;
    initProps(): void;
    props: any;
    initComputed(): void;
    computed: any;
    initActions(): void;
    links: any[] | undefined;
    readonly projectPath: any;
    readonly relPath: any;
    readonly fullPath: string | undefined;
    readonly defaultData: {
        allContext: any;
        allMeta: any;
        allTags: any;
        beforeText: any;
        completed: any;
        content: any;
        context: any;
        created: any;
        due: any;
        filteredListName: any;
        fullPath: string | undefined;
        id: any;
        interpretedContent: any;
        lastLine: any;
        line: any;
        list: any;
        meta: any;
        metaKeys: string[] | undefined;
        progress: any;
        projectPath: any;
        rawTask: any;
        relPath: any;
        source: any;
        started: any;
        tags: any;
        text: any;
        topics: string[] | undefined;
        totals: any;
    };
    initData(): void;
    dataKeys: string[] | undefined;
    data: any;
    updateDescriptionData(): void;
    desc: {
        title: any;
        html: any;
        truncHtml: any;
        encodedText: string;
        encodedMD: string;
        markdown: any;
        rawMarkdown: any;
        htmlLength: any;
        htmlTruncLength: any;
        isOverMaxLines: any;
    } | undefined;
    getEncodedContent(content: any): {
        encodedMD: string;
        encodedText: string;
        content: any;
    };
    formatContent(content: any, mustache: any): {
        encodedMD: string;
        encodedText: string;
        content: any;
    };
    format(content: any, mustache: any): any;
    getCardMarkdown(): {
        totalLines: number;
        markdown: string;
        rawMarkdown: string;
    };
    truncLines: any;
    getHtml(content: any): {
        html: any;
        truncHtml: any;
    };
    getDescriptionData(): {
        title: any;
        html: any;
        truncHtml: any;
        encodedText: string;
        encodedMD: string;
        markdown: any;
        rawMarkdown: any;
        htmlLength: any;
        htmlTruncLength: any;
        isOverMaxLines: any;
    };
    frontMatter: any;
    pos: any;
    rawTask: any;
    beforeText: any;
    text: any;
    list: any;
    order: any;
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
    readonly descriptionString: any;
    updateLastLine(): void;
    getLastLine(): any;
    parse(): void;
    paddingLength: number | undefined;
    metaKeys: string[] | undefined;
    topics: string[] | undefined;
    issueNumberRegExp(): RegExp;
    readonly listId: any;
    readonly path: any;
    readonly markdownBeforeText: string;
    getTextAndDescription(): any;
    getRawTextAndDescription(): any;
    getProgress(): {
        completed: any;
        total: any;
    };
    getContent(): any;
    updateContent(): void;
    updateFromContent(content: any): void;
    toJSON(): /*elided*/ any & {
        allTags: any;
        allContext: any;
        allMeta: any;
        config: undefined;
        expand: boolean;
    };
    getTagPrefix(): any;
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
    getMetaDataWithLinks(config: any): any[];
    getMetaLink(config: any, metaKey: any, metaValue: any): {
        title: string;
        url: string;
        icon: any;
    } | undefined;
    toString(): string;
    getRepoId(): any;
    getSource(): any;
    getId(): any;
    getList(): any;
    getText(opts: any, text: any): any;
    getChecksFromHtml(html: any): boolean[];
    getLine(): any;
    getType(): any;
    equals(task: any): boolean | undefined;
};
