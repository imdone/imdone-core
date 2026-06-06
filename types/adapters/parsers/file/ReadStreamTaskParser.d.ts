export class ReadStreamTaskParser {
    constructor(readStream: any);
    readStream: any;
    task: any;
    line: IteratorResult<string, any> | null;
    taskParsers: any[];
    lineNo: number;
    blankLines: number;
    readInterface: ReadLine.Interface;
    lineIterator: NodeJS.AsyncIterator<string, any, any>;
    readTask(): Promise<any>;
    nextTask: any;
    readLine(): Promise<IteratorResult<string, any>>;
    onLineRead(): void;
    shouldParseTaskLine(): boolean;
    getLineForTaskParsing(line: any): any;
    isEndOfTask(line: any): boolean;
    getTaskFromLine(line: any): undefined;
    addLineToTask(line: any): void;
    trimLinesToEndTask(): void;
    close(): void;
}
import * as ReadLine from 'node:readline/promises';
