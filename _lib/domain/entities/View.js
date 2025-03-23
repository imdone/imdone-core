const DEFAULT_VIEW_ID = "default"
const DEFAULT_VIEW_NAME = "Default View"

class View {
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

    get isModifiable () {
        return this.#modifiable
    }
}

View.DEFAULT_VIEW_ID = DEFAULT_VIEW_ID
View.DEFAULT_VIEW_NAME = DEFAULT_VIEW_NAME

module.exports = {
    View
}