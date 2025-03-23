export class ReadStreamCodeParser {
    constructor(readStream: any, filePath: any, lang: any, lists: any);
    lists: any;
    filePath: any;
    lang: any;
    taskParsers: any[];
    init(): Promise<void>;
    cards: any[] | undefined;
    readTask(): Promise<any>;
    parseCards(code: any, tokens?: string[]): any[];
    parseComments(code: any): any;
}
