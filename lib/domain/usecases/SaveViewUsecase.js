import { randomUUID} from 'node:crypto'
import { appContext as context } from '../../context/ApplicationContext.js'
import { getView } from './GetViewsUsecase.js'
import { View } from '../entities/View.js'

export async function saveView({id, name, lists, filter}) {
    let view = getView(id)

    if (!view) {
        view = {id: randomUUID(), name, lists, filter}
        context().repo.config.views.push(view)
    } else if (view.id === View.DEFAULT_VIEW_ID) {
        return
    } else {
        view.name = name
        view.filter = filter
        view.lists = lists
    }

    await saveConfig()
    return view.id
}

async function saveConfig() {
    return new Promise((resolve, reject) => {
        context().repo.saveConfig((err) => {
            if (err) return reject(err)
            resolve()
        })
    });
}

export async function removeDefaultViewFilter() {
    const project = context().project
    if (project.defaultFilter) {
        project.setFilter(project.defaultFilter)
        project.filter = project.defaultFilter
        project.defaultFilter = ''
        await saveConfig()
    }
}

export async function setDefaultViewFilter(filter = context().project.filter) {
    const project = context().project
    if (filter) {
        project.defaultFilter = filter
        project.filter = ''
        project.setFilter(project.filter)
        await saveConfig()
    }
}
