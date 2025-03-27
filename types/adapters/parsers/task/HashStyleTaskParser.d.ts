export class HashStyleTaskParser extends TaskParser {
    constructor(config: any);
    get pattern(): any;
    parse(lineContent: any, line: any, matchResult: any): {
        text: any;
        order: any;
        list: any;
        line: any;
        colon: any;
        type: any;
    };
}
import { TaskParser } from './TaskParser.js';
