const context = require('../context/ApplicationContext')
const { saveView } = require('../domain/usecases/SaveViewUsecase')

async function _saveView({id, name, lists = [], filter = context().project.defaultFilter}) {
    return saveView({id, name, lists, filter})
}

module.exports = {
    saveView: _saveView
}
