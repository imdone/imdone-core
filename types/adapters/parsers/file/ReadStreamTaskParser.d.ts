export class ReadStreamTaskParser {
    constructor(readStream: any);
    readStream: any;
    task: any;
    line: IteratorResult<string, any> | null;
    taskParsers: any[];
    lineNo: number;
    blankLines: number;
    readInterface: ReadLine.Interface;
    readTask(): Promise<any>;
    readLine(): Promise<IteratorResult<string, any>>;
    isEndOfTask(line: any): boolean;
    nextTask: any;
    getTaskFromLine(line: any): undefined;
    addLineToTask(line: any): void;
    trimLinesToEndTask(): void;
    close(): void;
}
import * as ReadLine from 'node:readline/promises';
