import { describe, expect, it, vi } from 'vitest'
import { Config } from '../config.js'
import { Repository } from '../repository.js'

function createRepository() {
  const config = Config.newDefaultConfig({
    customSetting: { enabled: true },
    lists: [
      { id: 'list-todo', name: 'TODO', hidden: false, color: '#111111' },
      { id: 'list-doing', name: 'DOING', hidden: true, color: '#222222', custom: { limit: 2 } },
      { id: 'list-done', name: 'DONE', hidden: false, color: '#333333' },
    ],
  })
  const repository = new Repository('/tmp/repository-move-list', config)
  repository.saveConfig = vi.fn().mockResolvedValue(undefined)
  return repository
}

describe('Repository.moveList', () => {
  it('persists the requested final position without changing list fields or unrelated config', async () => {
    const repository = createRepository()
    const beforeLists = repository.getLists()
    const unrelatedConfig = structuredClone(repository.config.customSetting)
    const modified = vi.fn()
    repository.on('list.modified', modified)

    await repository.moveList('DONE', 0)

    expect(repository.getLists().map(({ name }) => name)).toEqual(['DONE', 'TODO', 'DOING'])
    expect(repository.getList('DOING')).toEqual(beforeLists[1])
    expect(repository.config.customSetting).toEqual(unrelatedConfig)
    expect(repository.saveConfig).toHaveBeenCalledTimes(1)
    expect(modified).toHaveBeenCalledOnce()
    expect(modified).toHaveBeenCalledWith('DONE')
  })

  it.each([
    ['MISSING', 0],
    ['TODO', -1],
    ['TODO', 3],
    ['TODO', 1.5],
  ])('rejects invalid move %s to %s without saving or emitting', async (name, position) => {
    const repository = createRepository()
    const before = repository.getLists()
    const modified = vi.fn()
    repository.on('list.modified', modified)

    await expect(repository.moveList(name, position)).rejects.toThrow()

    expect(repository.getLists()).toEqual(before)
    expect(repository.saveConfig).not.toHaveBeenCalled()
    expect(modified).not.toHaveBeenCalled()
  })

  it('does not save or emit when the list is already at the requested position', async () => {
    const repository = createRepository()
    const modified = vi.fn()
    repository.on('list.modified', modified)

    await repository.moveList('DOING', 1)

    expect(repository.getLists().map(({ name }) => name)).toEqual(['TODO', 'DOING', 'DONE'])
    expect(repository.saveConfig).not.toHaveBeenCalled()
    expect(modified).not.toHaveBeenCalled()
  })

  it('restores the complete in-memory list state and emits no success when saving fails', async () => {
    const repository = createRepository()
    const before = repository.getLists()
    const modified = vi.fn()
    repository.on('list.modified', modified)
    repository.saveConfig.mockRejectedValueOnce(new Error('disk full'))

    await expect(repository.moveList('DONE', 0)).rejects.toThrow('disk full')

    expect(repository.getLists()).toEqual(before)
    expect(repository.saveConfig).toHaveBeenCalledTimes(1)
    expect(modified).not.toHaveBeenCalled()
  })
})
