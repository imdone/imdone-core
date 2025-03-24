export class ProjectContext extends FileProjectContext {
    constructor(repo: any);
    repo: any;
    getOrder(list: any, order: any): any;
    get config(): any;
    toJSON(): null;
    determineOrder(config: any, order: any, tasks: any): any;
}
import { FileProjectContext } from './FileProjectContext.js';
