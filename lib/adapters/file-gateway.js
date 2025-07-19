import _path from 'path'
import _fs from 'fs'
import sanitize from 'sanitize-filename'
import { logger } from './logger.js'

let fs = _fs

export async function exists(path) {
  try {
    return await stat(path)
  } catch {
    return false
  }
}

export function statSync(path) {
  logger.warn('statSync call')
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
  logger.warn('existsSync call')
  return fs.existsSync.apply({}, args)
}

export const stat = fs.promises.stat

export const lstat = fs.promises.lstat

export const lstatSync = fs.lstatSync

export function readFileSync(...args) {
  logger.warn('readFileSync call')
  return fs.readFileSync.apply({}, args)
}

export function appendFileSync(...args) {
  logger.warn('appendFileSync call')
  return fs.appendFileSync.apply({}, args)
}

export function writeFileSync(...args) {
  logger.warn('writeFileSync call')
  return fs.writeFileSync.apply({}, args)
}

export const writeFile = fs.promises.writeFile

export async function readdir(...args) {
  return fs.promises.readdir.apply({}, args)
}

export function unlinkSync(...args) {
  logger.warn('unlinkSync call')
  return fs.unlinkSync.apply({}, args)
}

export const unlink = fs.promises.unlink

export const mkdir = fs.promises.mkdir

export const readFile = fs.promises.readFile

export function readdirSyncRecursive(path) {
  logger.warn('readdirSyncRecursive call')
  // implement this function
  let results = []
  let list = fs.readdirSync(path)
  list.forEach(function(file) {
    file = _path.join(path, file)
    let stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      results = results.concat(readdirSyncRecursive(file))
    } else {
      results.push(file)
    }
  })
  return results
}

export function readdirSync(path) {
  logger.warn('readdirSync call')
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

function statsProps(stats) {
  return {
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory()
  }
}

export async function preparePathForWriting(path, directory = false) {
  // This is the fixed implementation
  let stats = await exists(path)
  if (stats) return statsProps(stats)

  let { dir } = directory ? { dir: path } : _path.parse(path)
  
  // Create directory if it doesn't exist - mkdir with recursive: true
  // is safe to call even if directory already exists
  try {
    await mkdir(dir, { recursive: true })
  } catch (error) {
    // Only throw if it's not an "already exists" error
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
  
  // Verify the directory was created/exists
  stats = await exists(dir)
  return statsProps(stats)
}

export async function cp(src, dest, opts) {
  return fs.promises.cp(src, dest, opts)
}

export async function rm(path, opts) {
  return fs.promises.rm(path, opts)
}

export default {
  cp,
  rm,
  exists,
  stat,
  lstat,
  lstatSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
  writeFile,
  readdir,
  unlink,
  mkdir,
  readFile,
  readdirSyncRecursive,
  readdirSync,
  sanitizeFileName,
  preparePathForWriting,
  unlinkSync,
  existsSync,
  sep
}
