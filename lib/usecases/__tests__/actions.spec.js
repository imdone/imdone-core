import { beforeEach, describe, expect, it, vi } from 'vitest'

const load = vi.fn()
const createFileSystemProject = vi.fn()
const log = vi.fn()

vi.mock('../../adapters/storage/config.js', () => ({ load }))
vi.mock('../../project-factory.js', () => ({ createFileSystemProject }))
vi.mock('../../adapters/logger.js', () => ({ logger: { log } }))

const { executeBoardAction, listAvailableActions } = await import('../actions.js')

describe('actions', () => {
  let project
  let file
  let activeTask

  beforeEach(() => {
    vi.clearAllMocks()
    activeTask = { text: 'Task' }
    file = {
      getTaskAtLine: vi.fn(() => activeTask),
    }
    project = {
      init: vi.fn(),
      toImdoneJSON: vi.fn(),
      getFile: vi.fn(() => file),
      performBoardAction: vi.fn(),
      boardActions: [{ id: 'archive', name: 'Archive' }],
    }
    load.mockResolvedValue({ settings: true })
    createFileSystemProject.mockReturnValue(project)
  })

  it('loads and initializes a project before executing a board action', async () => {
    await executeBoardAction({
      projectPath: '/repo',
      configPath: '/repo/.imdone/config.yml',
      action: { id: 'archive' },
      task: { filePath: 'README.md', line: 4 },
    })

    expect(load).toHaveBeenCalledWith('/repo', '/repo/.imdone/config.yml')
    expect(createFileSystemProject).toHaveBeenCalledWith({
      path: '/repo',
      config: { settings: true },
    })
    expect(project.init).toHaveBeenCalledOnce()
    expect(project.toImdoneJSON).toHaveBeenCalledOnce()
    expect(project.getFile).toHaveBeenCalledWith('README.md')
    expect(file.getTaskAtLine).toHaveBeenCalledWith(4)
    expect(project.performBoardAction).toHaveBeenCalledWith({ id: 'archive' }, activeTask)
  })

  it('executes a board action without an active task when task data is missing', async () => {
    await executeBoardAction({
      projectPath: '/repo',
      configPath: '/repo/.imdone/config.yml',
      action: { id: 'refresh' },
    })

    expect(project.getFile).not.toHaveBeenCalled()
    expect(project.performBoardAction).toHaveBeenCalledWith({ id: 'refresh' }, undefined)
  })

  it('does not read the file task when the line is invalid', async () => {
    await executeBoardAction({
      projectPath: '/repo',
      configPath: '/repo/.imdone/config.yml',
      action: { id: 'refresh' },
      task: { filePath: 'README.md', line: -1 },
    })

    expect(project.getFile).toHaveBeenCalledWith('README.md')
    expect(file.getTaskAtLine).not.toHaveBeenCalled()
    expect(project.performBoardAction).toHaveBeenCalledWith({ id: 'refresh' }, false)
  })

  it('logs the available board actions', async () => {
    await listAvailableActions('/repo', '/repo/.imdone/config.yml')

    expect(log).toHaveBeenCalledWith('\nAvailable actions:')
    expect(log).toHaveBeenCalledWith(JSON.stringify(project.boardActions, null, 2))
  })
})
