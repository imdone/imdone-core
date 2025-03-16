import tools from '../tools.js'
import _path from 'path'
import _fs from 'fs'
import sanitize from 'sanitize-filename'
import mkdirp from 'mkdirp'

let fs = _fs

export async function exists(path) {
  try {
    await fs.promises.access(path)
    return !!path
  } catch {
    return false
  }
}

export function mkdirpSync(path) {
  console.warn('sync call')
  return mkdirp.sync(path, { fs })
}

export function statSync(path) {
  console.warn('sync call')
  try {
    return fs.statSync(path)
  } catch {
  }
}

export function init(fileSystem = fs) {
  fs = fileSystem
}

export const sep = _path.sep

export function existsSync(...args) {
  console.warn('sync call')
  return fs.existsSync.apply({}, args)
}

export const stat = fs.promises.stat

export const lstat = fs.promises.lstat

export function readFileSync(...args) {
  console.warn('sync call')
  return fs.readFileSync.apply({}, args)
}

export function appendFileSync(...args) {
  console.warn('sync call')
  return fs.appendFileSync.apply({}, args)
}

export function writeFileSync(...args) {
  console.warn('sync call')
  return fs.writeFileSync.apply({}, args)
}

export const writeFile = fs.promises.writeFile

export async function readdir(...args) {
  return fs.promises.readdir.apply({}, args)
}

export function unlinkSync(...args) {
  console.warn('sync call')
  return fs.unlinkSync.apply({}, args)
}

export const unlink = fs.promises.unlink

export async function mkdir(path) {
  return fs.promises.mkdir(path)
}

export async function readFile(path) {
  return fs.promises.readFile(path, 'utf8')
}

export function readdirSyncRecursive(path) {
  console.warn('sync call')
  return tools.readdirSyncRecursive(fs, path)
}

export function readdirSync(path) {
  console.warn('sync call')
  return fs.readdirSync(path, { withFileTypes: true })
}

export function sanitizeFileName(fileName, replaceSpacesWith) {
  // Remove markdown emoji
  fileName = fileName.replace(/:\w+:/g, '').trim()
  fileName = sanitize(fileName)
  if (replaceSpacesWith)
    fileName = fileName.replace(/ /g, replaceSpacesWith)
  return fileName
}

export function preparePathForWriting(path) {
  let stat = statSync(path)
  if (!stat) {
    let { dir, ext } = _path.parse(path)
    if (!ext) {
      dir = path
    }
    mkdirpSync(dir)
    stat = statSync(path)
  }
  return {
    isFile: stat && stat.isFile(),
    isDirectory: stat && stat.isDirectory()
  }
}
