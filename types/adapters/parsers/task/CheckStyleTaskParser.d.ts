export class CheckStyleTaskParser extends TaskParser {
    constructor(config: any);
    get pattern(): RegExp;
    parse(lineContent: any, line: any, matchResult: any, task: any): {
        beforeText: any;
        text: any;
        list: any;
        line: any;
        checked: any;
        type: any;
    } | undefined;
}
import { TaskParser } from "./TaskParser.js";
