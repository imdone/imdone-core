export class View {
    id
    name
    lists
    filter
    #modifiable

    constructor({id, name, filter = "", lists = [], modifiable = false}) {
        if (!name) throw new Error('Name is a required field')
        this.id = id
        this.name = name
        this.lists = lists
        this.filter = filter
        this.#modifiable = modifiable
    }

    static DEFAULT_VIEW_ID = "default"
    static DEFAULT_VIEW_NAME = "Default View"

    get isModifiable () {
        return this.#modifiable
    }
}
