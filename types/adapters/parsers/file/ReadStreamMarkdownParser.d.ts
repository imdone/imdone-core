export class ReadStreamMarkdownParser extends ReadStreamTaskParser {
    constructor(readStream: any, config: any);
    frontmatterLines: any[];
    collectingFrontmatter: boolean;
    frontmatterClosed: boolean;
    ignoredByFrontmatter: boolean;
    currentLineIsFrontmatter: boolean;
    currentLineIsCodeFence: boolean;
    inCodeFence: boolean;
    taskParsers: (HashStyleTaskParser | MarkdownStyleTaskParser)[];
    onLineRead(line: any): void;
    updateFrontmatterState(line: any): void;
    updateIgnoredByFrontmatter(): void;
    updateCodeFenceState(line: any): void;
}
import { ReadStreamTaskParser } from './ReadStreamTaskParser.js';
import { HashStyleTaskParser } from '../task/HashStyleTaskParser.js';
import { MarkdownStyleTaskParser } from '../task/MarkdownStyleTaskParser.js';
