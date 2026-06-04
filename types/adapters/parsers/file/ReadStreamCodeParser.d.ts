export class ReadStreamCodeParser extends ReadStreamTaskParser {
    constructor(readStream: any, filePath: any, lang: any, lists: any);
    lists: any;
    filePath: any;
    lang: any;
    init(): Promise<void>;
    cards: any[] | undefined;
    parseCards(tokens?: string[]): Promise<any[]>;
    parseComments(): Promise<{}>;
}
import { ReadStreamTaskParser } from './ReadStreamTaskParser.js';
