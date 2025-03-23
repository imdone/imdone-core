export class CheckStyleTaskParser {
    get pattern(): RegExp;
    parse(lineContent: any, line: any, matchResult: any, task: any): {
        beforeText: any;
        text: any;
        line: any;
        checked: any;
        type: any;
    } | undefined;
}
