import { describe, expect, it, vi } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const loggerMock = vi.hoisted(() => ({
  log: vi.fn(),
  warn: vi.fn(),
}))
const fileGatewayMock = vi.hoisted(() => ({
  exists: vi.fn(),
}))

vi.mock('../../adapters/logger.js', () => ({
  logger: loggerMock,
}))
vi.mock('../../adapters/file-gateway.js', () => fileGatewayMock)

import ExtensionPlugin from '../extension-plugin.js'

describe('ExtensionPlugin', () => {
  it('loads extension modules through file URL import specifiers', async () => {
    fileGatewayMock.exists.mockResolvedValue(true)
    const dirname = path.dirname(fileURLToPath(import.meta.url))
    const projectDir = path.join(dirname, 'fixtures', 'extension-project')

    const plugin = new ExtensionPlugin({ path: projectDir })
    const extensionPath = plugin.getExtensionPath(['actions', 'card'])
    const extension = await plugin.loadExtensionModule(() => [], 'actions', 'card')

    expect(fileGatewayMock.exists).toHaveBeenCalledWith(extensionPath)
    expect(loggerMock.warn).not.toHaveBeenCalled()
    expect(extension()).toEqual([{ title: 'Open', action: 'open' }])
  })
})
