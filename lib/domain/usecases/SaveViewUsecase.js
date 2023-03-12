const crypto = require('crypto')
const context = require('../../context/ApplicationContext')
const { getView } = require('./GetViewUsecase')

async function saveView({id, name, lists, filter}) {
    let view = getView(id)

    if (!view) {
        view = {id: crypto.randomUUID(), name, lists, filter}
        context().repo.config.views.push(view)
    } else {
        view = {...view, name, filter, lists}
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

module.exports = {
    saveView
}