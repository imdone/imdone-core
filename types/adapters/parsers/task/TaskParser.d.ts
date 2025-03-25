export class TaskParser {
    constructor(type: any, config: any);
    config: any;
    type: any;
    get pattern(): void;
    parseLine(lineContent: any, line: any, task: any): any;
}
