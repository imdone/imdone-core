export namespace constants {
    export namespace JOURNAL_TYPE {
        let SINGLE_FILE: string;
        let FOLDER: string;
        let NEW_FILE: string;
    }
    export let ASYNC_LIMIT: number;
    export { CONFIG_DIR };
    export let CONFIG_FILE: string;
    export let CONFIG_FILE_YML: string;
    export let SORT_FILE: string;
    export let TEMPLATES_DIR: string;
    export let IGNORE_FILE: string;
    export let DEFAULT_FILE_PATTERN: string;
    export { DEFAULT_IGNORE };
    export { DEFAULT_IGNORE_DIRS };
    export { DEFAULT_IGNORE_EXTS };
    export namespace ERRORS {
        let NOT_A_FILE: string;
        let CALLBACK_REQUIRED: string;
        let NO_CONTENT: string;
        let LIST_NOT_FOUND: string;
        let TASK_NOT_FOUND: string;
    }
    export namespace DEFAULT_CONFIG {
        let keepEmptyPriority: boolean;
        namespace code {
            let include_lists: string[];
        }
        let lists: {
            hidden: boolean;
            name: string;
        }[];
    }
}
declare var CONFIG_DIR: string;
declare var DEFAULT_IGNORE: string;
declare var DEFAULT_IGNORE_DIRS: string;
declare var DEFAULT_IGNORE_EXTS: string;
export {};
