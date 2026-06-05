import { pathToFileURL } from 'node:url'

const WINDOWS_DRIVE_PATH = /^[a-zA-Z]:[\\/]/
const WINDOWS_UNC_PATH = /^\\\\[^\\]+\\[^\\]+/

export function toFileImportSpecifier(filePath) {
  const value = String(filePath)
  if (/^(file|data|node):/i.test(value)) return value
  if (WINDOWS_DRIVE_PATH.test(value)) return windowsDrivePathToFileURL(value)
  if (WINDOWS_UNC_PATH.test(value)) return windowsUncPathToFileURL(value)

  return pathToFileURL(filePath).href
}

function windowsDrivePathToFileURL(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/')
  return `file:///${encodePathSegments(normalizedPath)}`
}

function windowsUncPathToFileURL(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const [host, ...pathSegments] = normalizedPath.split('/')
  return `file://${host}/${pathSegments.map(encodeURIComponent).join('/')}`
}

function encodePathSegments(filePath) {
  return filePath
    .split('/')
    .map(segment => /^[a-zA-Z]:$/.test(segment) ? segment : encodeURIComponent(segment))
    .join('/')
}
