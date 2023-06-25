const crypto = require('crypto')
const context = require('../../context/ApplicationContext')
const { getView } = require('./GetViewsUsecase')
const { View } = require('../entities/View')

async function saveView({id, name, lists, filter}) {
    let view = getView(id)

    if (!view) {
        view = {id: crypto.randomUUID(), name, lists, filter}
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

async function removeDefaultViewFilter() {
    const project = context().project
    if (project.defaultFilter) {
        project.setFilter(project.defaultFilter)
        project.filter = project.defaultFilter
        project.defaultFilter = ''
        await saveConfig()
    }
}

async function setDefaultViewFilter(filter = context().project.filter) {
    const project = context().project
    if (filter) {
        project.defaultFilter = filter
        project.filter = ''
        project.setFilter(project.filter)
        await saveConfig()
    }
}

module.exports = {
    removeDefaultViewFilter,
    setDefaultViewFilter,
    saveView
}