import { pathToFileURL } from 'node:url'

export function toFileImportSpecifier(filePath) {
  return pathToFileURL(filePath).href
}
