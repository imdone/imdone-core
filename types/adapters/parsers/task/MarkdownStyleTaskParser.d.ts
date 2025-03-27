export class MarkdownStyleTaskParser extends TaskParser {
    constructor(config: any);
    get pattern(): RegExp;
    parse(lineContent: any, line: any, matchResult: any): {
        beforeText: any;
        text: any;
        order: any;
        list: any;
        line: any;
        colon: any;
        type: any;
    };
}
import { TaskParser } from './TaskParser.js';
