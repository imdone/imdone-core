import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../adapters/file-gateway.js', () => ({
  preparePathForWriting: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
  lstat: vi.fn(),
  unlink: vi.fn()
}))

import { fileSystemStoreMixin } from '../repo-fs-store.js'
import { Repository } from '../../repository.js'
import { Config } from '../../config.js'
import { File } from '../../file.js'
import {
  preparePathForWriting,
  writeFile,
  stat,
  lstat
} from '../../adapters/file-gateway.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('RepoFsStore write boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not advance to post-write stat until the filesystem write resolves', async () => {
    const config = Config.newDefaultConfig({
      settings: {
        cards: {}
      }
    })

    const fakeFs = {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn(),
      promises: {
        lstat: vi.fn().mockResolvedValue({
          isDirectory: () => false
        })
      }
    }

    const repo = fileSystemStoreMixin(new Repository('/repo', config), fakeFs)
    const file = new File({
      repoId: '/repo',
      filePath: 'current-sprint/PROJ-1-Test/issue-PROJ-1.md',
      content: '# Test\nBody\n',
      project: {}
    })

    const pendingWrite = deferred()
    let settled = false

    preparePathForWriting.mockResolvedValue({
      isDirectory: false
    })
    writeFile.mockReturnValue(pendingWrite.promise)
    stat.mockResolvedValue({
      mtime: new Date('2026-04-24T00:00:00Z'),
      birthtime: new Date('2026-04-24T00:00:00Z'),
      isFile: () => true
    })
    lstat.mockResolvedValue({
      isDirectory: () => false
    })

    const writePromise = repo.writeFile(file)
    writePromise.then(() => {
      settled = true
    })

    await flushMicrotasks()

    expect(preparePathForWriting).toHaveBeenCalledWith('/repo/current-sprint/PROJ-1-Test/issue-PROJ-1.md')
    expect(writeFile).toHaveBeenCalledWith(
      '/repo/current-sprint/PROJ-1-Test/issue-PROJ-1.md',
      file.getContentForFile(),
      'utf8'
    )
    expect(stat).not.toHaveBeenCalled()
    expect(settled).toBe(false)

    pendingWrite.resolve()
    await writePromise

    expect(stat).toHaveBeenCalledWith('/repo/current-sprint/PROJ-1-Test/issue-PROJ-1.md')
    expect(file.modified).toBe(false)
    expect(settled).toBe(true)
  })
})
