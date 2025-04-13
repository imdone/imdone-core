export const logger: Logger;
declare class Logger {
    level: number;
    setLevel(level: any): this;
    shouldLog(level: any): boolean;
    formatMessage(args: any): any;
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    trace(...args: any[]): void;
    time(label: any): void;
    timeEnd(label: any): void;
}
export namespace LogLevel {
    let ERROR: number;
    let WARN: number;
    let INFO: number;
    let DEBUG: number;
    let TRACE: number;
    let NONE: number;
}
export {};
