export class ProjectContext extends FileProjectContext {
    constructor(repo: any);
    repo: any;
    get config(): any;
    toJSON(): null;
    determineOrder(config: any, order: any, tasks: any): any;
}
import { FileProjectContext } from './FileProjectContext.js';
