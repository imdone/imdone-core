/**
 * Description
 * @method List
 * @param {} name
 * @param {} hidden
 * @return
 */
export default class List {
    static isList(list: any): list is List;
    constructor({ name, hidden, ignore, filter, id }: {
        name: any;
        hidden: any;
        ignore: any;
        filter: any;
        id: any;
    });
    name: any;
    hidden: any;
    ignore: any;
    id: any;
    filter: any;
    tasks: any[];
    isHidden(): any;
    getName(): any;
    getTasks(): any[];
    addTask(task: any): void;
    setTasks(tasks: any): void;
    hasTasks(): boolean;
    toConfig(): this;
}
