export class View {
    static DEFAULT_VIEW_ID: string;
    static DEFAULT_VIEW_NAME: string;
    constructor({ id, name, filter, lists, modifiable }: {
        id: any;
        name: any;
        filter?: string | undefined;
        lists?: never[] | undefined;
        modifiable?: boolean | undefined;
    });
    id: any;
    name: any;
    lists: any[];
    filter: string;
    get isModifiable(): boolean;
    #private;
}
