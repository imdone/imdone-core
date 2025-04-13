export function getHashStyleRegex(tokenPrefix?: string, orderMeta?: boolean): any;
export function getCheckedData(content: any): {
    pad: number;
    checked: boolean;
} | null;
export function hasTaskInText(config: any, text: any, isCodeFile: any): boolean;
export function isBeforeTextMarkdownList(beforeText: any): boolean;
export function padDescription(description?: any[], beforeText?: string): any[];
export function getTaskContent({ config, content, inBlockComment, beforeText, fileType, lang }: {
    config: any;
    content: any;
    inBlockComment: any;
    beforeText: any;
    fileType: any;
    lang: any;
}): {
    rawTaskContentLines: string[];
    taskContentLines: string[];
} | undefined;
export function getRawTask({ tokenPrefix, orderMeta, beforeText, hasColon, list, order, text, type }: {
    tokenPrefix?: string | undefined;
    orderMeta?: boolean | undefined;
    beforeText?: string | undefined;
    hasColon?: boolean | undefined;
    list: any;
    order?: string | undefined;
    text: any;
    type?: string | undefined;
}): string;
export function isNumber(value: any): boolean;
export function toNumber(value: any): number | undefined;
export namespace FILE_TYPES {
    let MARKDOWN: string;
    let CODE: string;
}
export namespace TASK_TYPES {
    let CODE_1: string;
    export { CODE_1 as CODE };
    export let HASHTAG: string;
    let MARKDOWN_1: string;
    export { MARKDOWN_1 as MARKDOWN };
}
export const LIST_NAME_PATTERN: "[\\p{L}0-9-_]{2,}";
export const LINK_STYLE_REGEX: any;
export const CHECK_REGEX: RegExp;
