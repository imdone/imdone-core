const context = require('../../context/ApplicationContext');

function getView(_id) {
    const config = context().repo.config
    return config.views.find(view => view.id === _id)
}

module.exports = {
    getView
}