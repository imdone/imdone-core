export class ReadStreamCodeParser extends ReadStreamTaskParser {
    constructor(readStream: any, filePath: any, lang: any, lists: any);
    lists: any;
    filePath: any;
    lang: any;
    taskParsers: CodeStyleTaskParser[];
    init(): Promise<void>;
    cards: any[] | undefined;
    parseCards(code: any, tokens?: string[]): any[];
    parseComments(code: any): any;
}
import { ReadStreamTaskParser } from './ReadStreamTaskParser.js';
import { CodeStyleTaskParser } from '../task/CodeStyleTaskParser.js';
