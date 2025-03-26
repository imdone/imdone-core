import { appContext as context } from '../../context/ApplicationContext.js'
import { View } from '../entities/View.js'
import List from '../../list.js'

export function getView(_id) {
    return getViews().find(view => view.id === _id)
}

export function getDefaultView() {
    const lists = getConfig().lists.map(list => {
        list = new List(list)
        delete list.tasks
        return list
    })
    const filter = getConfig().defaultFilter
    const id = View.DEFAULT_VIEW_ID
    const name = View.DEFAULT_VIEW_NAME
    return new View({name, id, filter, lists})
}

function syncLists(currentLists, overrideLists) {
    return currentLists.map(currentList => {
        return overrideLists.find(list => list.name === currentList.name && list.id === currentList.id) 
            || new List(currentList)
    })
}

export function getViews() {
    const defaultView = getDefaultView()
    const customViews = context().repo.config.views.map(
        ({name, id, filter, lists, modifiable = true}) => new View ({
            name,
            id,
            filter,
            lists: syncLists(defaultView.lists, lists),
            modifiable
        })
    )
    return [defaultView, ...customViews]
}

function getConfig() {
    return context().repo.config
}
