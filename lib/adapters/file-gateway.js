const tools = require('../tools')
const _path = require('path')
let fs = require('fs')
const sanitize = require('sanitize-filename')


module.exports = {
  init(fileSystem = fs) {
    fs = fileSystem
  },

  sep: _path.sep,

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

  appendFileSync(...args) {
    console.warn('sync call')
    return fs.appendFileSync.apply({}, args)
  },

  writeFileSync(...args) {
    console.warn('sync call')
    return fs.writeFileSync.apply({}, args)
  },

  writeFile(...args) {
    return fs.promises.writeFile.apply({}, args)
  },

  async readdir(...args) {
    return fs.promises.readdir.apply({}, args)
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
    try {
      return fs.statSync(path)
    } catch {
    }
  },

  readdirSyncRecursive(path) {
    console.warn('sync call')
    return tools.readdirSyncRecursive(fs, path)
  },

  readdirSync(path) {
    console.warn('sync call')
    return fs.readdirSync(path, { withFileTypes: true })
  },
  
  sanitizeFileName(fileName, replaceSpacesWith) {
    // Remove markdown emoji
    fileName = fileName.replace(/:\w+:/g, '').trim()
    fileName = sanitize(fileName)
    if (replaceSpacesWith)
      fileName = fileName.replace(/ /g, replaceSpacesWith)
    return fileName
  },

  preparePathForWriting(path) {
    let stat = this.statSync(path)
    if (!stat) {
      let { dir, ext } = _path.parse(path)
      if (!ext) {
        dir = path
      }
      this.mkdirpSync(dir)
      stat = this.statSync(path)
    }
    return {
      isFile: stat && stat.isFile(),
      isDirectory: stat && stat.isDirectory()
    }
  }
}
