const tools = require('../tools')

let fs = require('fs')

module.exports = {
  init(fileSystem = fs) {
    fs = fileSystem
  },

  sep: require('path').sep,

  existsSync(...args) {
    console.warn('sync call')
    return fs.existsSync.apply({}, args)
  },

  async exists(path) {
    try {
      await fs.promises.access(path)
      return path
    } catch {
      return false
    }
  },

  readFileSync(...args) {
    console.warn('sync call')
    return fs.readFileSync.apply({}, args)
  },

  writeFileSync(...args) {
    console.warn('sync call')
    return fs.writeFileSync.apply({}, args)
  },

  readdir(...args) {
    return fs.readdir.apply({}, args)
  },

  unlinkSync(...args) {
    console.warn('sync call')
    return fs.unlinkSync.apply({}, args)
  },

  mkdirpSync(path) {
    console.warn('sync call')
    return require('mkdirp').sync(path, { fs })
  },

  async mkdir(path) {
    return fs.promises.mkdir(path)
  },

  async readFile(path) {
    return fs.promises.readFile(path, 'utf8')
  },

  statSync(path) {
    console.warn('sync call')
    return fs.statSync(path)
  },

  readdirSyncRecursive(path) {
    console.warn('sync call')
    return tools.readdirSyncRecursive(fs, path)
  },

  readdirSync(path) {
    console.warn('sync call')
    return fs.readdirSync(path, { withFileTypes: true })
  },
}
