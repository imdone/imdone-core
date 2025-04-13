export function saveView({ id, name, lists, filter }: {
    id: any;
    name: any;
    lists: any;
    filter: any;
}): Promise<any>;
export function removeDefaultViewFilter(): Promise<void>;
export function setDefaultViewFilter(filter?: any): Promise<void>;
