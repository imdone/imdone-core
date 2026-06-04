import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Config } from '../config'
import { File } from '../file'
import { createFileSystemProject } from '../project-factory'

async function createProjectWithSupportedFiles() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdone-core-stream-init-'))
  await writeFile(
    path.join(root, 'tasks.md'),
    '#TODO Stream markdown task\n\n',
    'utf8'
  )
  await writeFile(
    path.join(root, 'tasks.js'),
    '// TODO: Stream code task\n',
    'utf8'
  )

  const project = createFileSystemProject({
    path: root,
    config: Config.newDefaultConfig(),
    loadInstalledPlugins: () => {},
    loadPluginsNotInstalled: () => {},
  })

  return { project, root }
}

async function createProjectWithMutationFixtures() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdone-core-stream-mutation-'))
  await writeFile(
    path.join(root, 'hash.md'),
    '#TODO Hash task\n<!--\norder:10\n-->\n\n',
    'utf8'
  )
  await writeFile(
    path.join(root, 'link.md'),
    '[Link task](#TODO:20)\n\n',
    'utf8'
  )
  await writeFile(
    path.join(root, 'checkbox.md'),
    '- [ ] Checkbox task\n\n',
    'utf8'
  )
  await writeFile(
    path.join(root, 'code.js'),
    '// TODO: Code task\n// code detail\n',
    'utf8'
  )

  const config = Config.newDefaultConfig()
  config.settings.cards.addCheckBoxTasks = true

  const project = createFileSystemProject({
    path: root,
    config,
    loadInstalledPlugins: () => {},
    loadPluginsNotInstalled: () => {},
  })

  return { project, root }
}

async function createProjectWithUnsafeBlockCommentFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdone-core-stream-fallback-'))
  await writeFile(
    path.join(root, 'block.js'),
    [
      'function work() {',
      '  /*',
      '   * TODO: Block comment task',
      '   * block detail',
      '   */',
      '}',
      '',
    ].join('\n'),
    'utf8'
  )

  const project = createFileSystemProject({
    path: root,
    config: Config.newDefaultConfig(),
    loadInstalledPlugins: () => {},
    loadPluginsNotInstalled: () => {},
  })

  return { project, root }
}

async function createProjectWithAddFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdone-core-stream-add-'))
  await writeFile(
    path.join(root, 'tasks.md'),
    '#TODO Existing task\n\n',
    'utf8'
  )

  const config = Config.newDefaultConfig()
  config.settings.newCardSyntax = 'HASHTAG'
  config.settings.cards.orderMeta = true
  config.settings.cards.taskPrefix = '- [ ]'

  const project = createFileSystemProject({
    path: root,
    config,
    loadInstalledPlugins: () => {},
    loadPluginsNotInstalled: () => {},
  })

  return { project, root }
}

function getTask(repo, text) {
  return repo.getTasks().find((task) => task.text === text)
}

async function readProjectFile(root, filePath) {
  return readFile(path.join(root, filePath), 'utf8')
}

describe.sequential('stream-backed repo init', () => {
  let project
  let root

  afterEach(async () => {
    vi.restoreAllMocks()
    if (project) await project.destroy()
    if (root) await rm(root, { recursive: true, force: true })
    project = undefined
    root = undefined
  })

  it('discovers supported files through the read stream parser path and emits parser diagnostics', async () => {
    const context = await createProjectWithSupportedFiles()
    project = context.project
    root = context.root
    const diagnostics = []
    project.repo.on('file.parser', (diagnostic) => diagnostics.push(diagnostic))
    const legacyExtraction = vi.spyOn(File.prototype, 'extractAndTransformTasks')

    await project.init()

    expect(legacyExtraction).not.toHaveBeenCalled()
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'tasks.js',
        mode: 'stream',
      }),
      expect.objectContaining({
        path: 'tasks.md',
        mode: 'stream',
      }),
    ]))
    expect(project.repo.getTasks().map((task) => task.text).sort()).toEqual([
      'Stream code task',
      'Stream markdown task',
    ])
  })

  it('preserves markdown and code-comment formatting when stream-discovered tasks move and re-extract', async () => {
    const context = await createProjectWithMutationFixtures()
    project = context.project
    root = context.root
    const diagnostics = []
    project.repo.on('file.parser', (diagnostic) => diagnostics.push(diagnostic))

    await project.init()
    await project.repo.moveTasks([
      getTask(project.repo, 'Hash task'),
      getTask(project.repo, 'Code task'),
    ], 'DOING', 0)
    await project.repo.moveTasks([getTask(project.repo, 'Checkbox task')], 'DONE', 0)

    expect(await readProjectFile(root, 'hash.md')).toContain('#DOING Hash task')
    expect(await readProjectFile(root, 'code.js')).toContain('// DOING: Code task')
    expect(await readProjectFile(root, 'checkbox.md')).toContain('- [x] #DONE Checkbox task')
    expect(project.repo.getTasksInList('DOING').map((task) => task.text)).toEqual(
      expect.arrayContaining(['Hash task', 'Code task'])
    )
    expect(project.repo.getTasksInList('DONE').map((task) => task.text)).toContain('Checkbox task')
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'hash.md', mode: 'stream' }),
      expect.objectContaining({ path: 'code.js', mode: 'stream' }),
      expect.objectContaining({ path: 'checkbox.md', mode: 'stream' }),
    ]))
  })

  it('preserves markdown-link task shape when a stream-discovered task is edited and re-extracted', async () => {
    const context = await createProjectWithMutationFixtures()
    project = context.project
    root = context.root

    await project.init()
    const linkTask = getTask(project.repo, 'Link task')
    await project.repo.modifyTaskFromContent(
      linkTask,
      `${linkTask.text}\nupdated detail`
    )

    const linkContent = await readProjectFile(root, 'link.md')
    expect(linkContent).toContain('[Link task](#TODO:)')
    expect(linkContent).toContain('updated detail')
    expect(linkContent).toContain('order:20')
    expect(getTask(project.repo, 'Link task').description).toContain('updated detail')
  })

  it('falls back to legacy extraction for block-comment code tasks without stream-safe write-back context', async () => {
    const context = await createProjectWithUnsafeBlockCommentFixture()
    project = context.project
    root = context.root
    const diagnostics = []
    project.repo.on('file.parser', (diagnostic) => diagnostics.push(diagnostic))
    const legacyExtraction = vi.spyOn(File.prototype, 'extractAndTransformTasks')

    await project.init()

    expect(legacyExtraction).toHaveBeenCalled()
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'block.js',
        mode: 'legacy-fallback',
        reason: expect.stringMatching(/\S/),
      }),
    ]))
    expect(getTask(project.repo, 'Block comment task').inBlockComment).toBe(true)
  })

  it('preserves configured hash task prefix when a task is added after stream-backed init and re-extracted', async () => {
    const context = await createProjectWithAddFixture()
    project = context.project
    root = context.root
    const diagnostics = []
    project.repo.on('file.parser', (diagnostic) => diagnostics.push(diagnostic))

    await project.init()
    const { task } = await project.repo.addTaskToFile(
      path.join(root, 'tasks.md'),
      'DOING',
      'Added task\nadded detail'
    )

    expect(task.text).toBe('Added task')
    expect(task.beforeText).toBe('- [ ] ')
    expect(task.rawTask).toBe('#DOING Added task')
    expect(task.description).toEqual(expect.arrayContaining([
      'added detail',
      '<!-- order:0 -->',
    ]))
    expect(diagnostics.filter(({ path, mode }) => path === 'tasks.md' && mode === 'stream')).toHaveLength(2)
  })

})
