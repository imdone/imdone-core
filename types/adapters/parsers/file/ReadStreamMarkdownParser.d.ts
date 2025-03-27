export class ReadStreamMarkdownParser extends ReadStreamTaskParser {
    constructor(readStream: any, config: any);
    taskParsers: (HashStyleTaskParser | MarkdownStyleTaskParser)[];
}
import { ReadStreamTaskParser } from './ReadStreamTaskParser.js';
import { HashStyleTaskParser } from '../task/HashStyleTaskParser.js';
import { MarkdownStyleTaskParser } from '../task/MarkdownStyleTaskParser.js';
