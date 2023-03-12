const context = require('../context/ApplicationContext')
const { saveView } = require('../domain/usecases/SaveViewUsecase')

async function _saveView({id, name, lists = [], filter = context().project.defaultFilter}) {
    if (!name) throw new Error('Name is a required field')
    return saveView({id, name, lists, filter})
}

module.exports = {
    saveView: _saveView
}