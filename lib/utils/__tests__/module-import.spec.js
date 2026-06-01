import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import { toFileImportSpecifier } from '../module-import.js'

describe('module import utilities', () => {
  it('converts an absolute filesystem path into a file URL for dynamic import', () => {
    const specifier = toFileImportSpecifier(path.join(os.tmpdir(), 'imdone-extension.js'))

    expect(specifier).toMatch(/^file:\/\//)
    expect(specifier).toContain('imdone-extension.js')
  })
})
