export default function newCard(task: any, _project: any, dontParse: any): {
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
    readonly defaultData: any;
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
};
