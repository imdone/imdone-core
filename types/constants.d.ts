export namespace constants {
    export { JOURNAL_TYPE };
    export let ASYNC_LIMIT: number;
    export { CONFIG_DIR };
    export { CONFIG_FILE };
    export { CONFIG_FILE_YML };
    export { SORT_FILE };
    export { TEMPLATES_DIR };
    export let IGNORE_FILE: string;
    export let DEFAULT_FILE_PATTERN: string;
    export { DEFAULT_IGNORE };
    export { DEFAULT_IGNORE_PATHS };
    export { DEFAULT_IGNORE_EXTS };
    export namespace ERRORS {
        let NOT_A_FILE: string;
        let CALLBACK_REQUIRED: string;
        let NO_CONTENT: string;
        let LIST_NOT_FOUND: string;
        let TASK_NOT_FOUND: string;
    }
    export { DEFAULT_CONFIG };
}
declare const JOURNAL_TYPE: {
    SINGLE_FILE: string;
    FOLDER: string;
    NEW_FILE: string;
};
declare const CONFIG_DIR: ".imdone";
declare const CONFIG_FILE: string;
declare const CONFIG_FILE_YML: string;
declare const SORT_FILE: string;
declare const TEMPLATES_DIR: string;
declare const DEFAULT_IGNORE: string;
declare var DEFAULT_IGNORE_PATHS: string;
declare var DEFAULT_IGNORE_EXTS: string;
declare const DEFAULT_CONFIG: {
    keepEmptyPriority: boolean;
    code: {
        include_lists: string[];
    };
    lists: {
        hidden: boolean;
        name: string;
    }[];
};
export {};
