export function getLang(config: any, filePath: any): any;
export function getLanguages(config: any): any;
export function getFileParser(filePath: any, config: any, readStream: any): Promise<ReadStreamMarkdownParser | ReadStreamCodeParser>;
import { ReadStreamMarkdownParser } from './ReadStreamMarkdownParser.js';
import { ReadStreamCodeParser } from './ReadStreamCodeParser.js';
