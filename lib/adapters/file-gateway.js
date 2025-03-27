import { tools } from '../tools.js'
import _path from 'path'
import _fs from 'fs'
import sanitize from 'sanitize-filename'

let fs = _fs

export async function exists(path) {
  try {
    return await stat(path)
  } catch {
    return false
  }
}

export function statSync(path) {
  console.warn('statSync call')
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
  console.warn('existsSync call')
  return fs.existsSync.apply({}, args)
}

export const stat = fs.promises.stat

export const lstat = fs.promises.lstat

export const lstatSync = fs.lstatSync

export function readFileSync(...args) {
  console.warn('readFileSync call')
  return fs.readFileSync.apply({}, args)
}

export function appendFileSync(...args) {
  console.warn('appendFileSync call')
  return fs.appendFileSync.apply({}, args)
}

export function writeFileSync(...args) {
  console.warn('writeFileSync call')
  return fs.writeFileSync.apply({}, args)
}

export const writeFile = fs.promises.writeFile

export async function readdir(...args) {
  return fs.promises.readdir.apply({}, args)
}

export function unlinkSync(...args) {
  console.warn('unlinkSync call')
  return fs.unlinkSync.apply({}, args)
}

export const unlink = fs.promises.unlink

export const mkdir = fs.promises.mkdir

export const readFile = fs.promises.readFile

export function readdirSyncRecursive(path) {
  console.warn('readdirSyncRecursive call')
  return tools.readdirSyncRecursive(fs, path)
}

export function readdirSync(path) {
  console.warn('readdirSync call')
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

export async function preparePathForWriting(path) {
  let stats = await exists(path)
  if (stats) return statsProps(stats)

  let { dir } = _path.parse(path)
  stats = await exists(dir)
  if (stats) return statsProps(stats)

  await mkdir(dir, { recursive: true })
  stats = await exists(dir)
  return statsProps(stats)
}

export async function cp(src, dest, opts) {
  return fs.promises.cp(src, dest, opts)
}

export default {
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
