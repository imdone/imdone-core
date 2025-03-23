declare namespace _default {
    export function union(...arrays: any[]): any[];
    export function escapeRegExp(str: any): any;
    export function userHome(): string | undefined;
    export { deepEqual };
    /**
     * Description
     * @method user
     * @return LogicalExpression
     */
    export function user(): string | undefined;
    /**
     * Description
     * @method cb
     * @param {} cb
     * @return ConditionalExpression
     */
    export function cb(cb: any): any;
    export function inMixinsNoop(cb: any): any;
    export function sha(data: any): string;
    export function format(template: any, col: any, ...args: any[]): any;
    export function isBinaryFile(fs: any, file: any, callback: any): void;
    export { isBinaryCheck };
    export function sortTasks(tasks: any): any[];
    export function hasBlankLines(content: any): boolean;
}
export default _default;
declare function deepEqual(a: any, b: any): any;
declare function isBinaryCheck(bytes: any, size: any): boolean;
