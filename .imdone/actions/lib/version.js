const path = require('path')
const fs = require('fs')
const VERSION_INDEX = {
  major: 0,
  minor: 1,
  patch: 2,
}

module.exports = function (project) {
  const packagePath = path.join(project.path, 'package.json')

  function package() {
    delete require.cache[require.resolve(packagePath)]
    return require(packagePath)
  }

  function get() {
    return package().version
  }

  async function update(increment) {
    const splitVersion = get().split('.')
    const index = VERSION_INDEX[increment]

    const version = splitVersion
      .map((versionPart, i) => {
        if (i < index) return versionPart
        if (i > index) return '0'
        return `${parseInt(versionPart, 10) + 1}`
      })
      .join('.')

    const packageJson = { ...package(), version }

    await fs.promises.writeFile(
      packagePath,
      JSON.stringify(packageJson, null, 2)
    )
  }

  return {
    get,
    update,
  }
}
