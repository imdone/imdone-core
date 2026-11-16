import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createFileSystemProject, createWatchedFileSystemProject } from '../../project-factory.js'

const fixtures = []
const conflict = Buffer.from([
  '# #TODO Conflict fixture',
  '',
  'Preserve both alternatives while a person resolves the conflict.',
  '<!--',
  'protectedkey:protectedvalue +protectedtag @protectedcontext',
  '<<<<<<< HEAD',
  'order:60',
  '=======',
  'order:80',
  '>>>>>>> provider-update',
  '-->',
  '',
].join('\n'))
const ordinary = Buffer.from('# #TODO Ordinary card awaiting order metadata\n')
const unchanged = Buffer.from('Unrelated text without a card or conflict.\r\n')

async function fixture({ watched = false, initiallyConflicted = false } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'imdone-core-conflict-read-'))
  const entry = { directory, project: null }
  fixtures.push(entry)
  await mkdir(path.join(directory, '.imdone'))
  await writeFile(path.join(directory, '.imdone/config.yml'), [
    'keepEmptyPriority: false',
    'lists:',
    '  - name: TODO',
    '  - name: DOING',
    'settings:',
    '  cards:',
    '    taskPrefix: "#"',
    '    orderMeta: true',
    '    metaSep: ":"',
    '    maxLines: 30',
    '    endTaskAtEndOfFile: true',
    '',
  ].join('\n'))
  await writeFile(path.join(directory, 'conflicted.md'), initiallyConflicted ? conflict : '# #TODO Initial card\n')
  await writeFile(path.join(directory, 'ordinary.md'), ordinary)
  await writeFile(path.join(directory, 'unrelated.txt'), unchanged)
  const create = watched ? createWatchedFileSystemProject : createFileSystemProject
  entry.project = create({ path: directory, loadInstalledPlugins: () => {}, loadPluginsNotInstalled: () => {} })
  await entry.project.init()
  return { project: entry.project, repo: entry.project.repo, directory,
    conflictedPath: path.join(directory, 'conflicted.md'), ordinaryPath: path.join(directory, 'ordinary.md'),
    unrelatedPath: path.join(directory, 'unrelated.txt') }
}

function nextWatcherChange(repo, relativePath) {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); repo.removeListener('watch.change', onUpdate) }
    const onUpdate = file => {
      if (file?.path !== relativePath) return
      cleanup()
      resolve(file)
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Actual watcher did not incorporate ${relativePath}`))
    }, 4000)
    repo.on('watch.change', onUpdate)
  })
}

afterEach(async () => {
  for (const { project, directory } of fixtures.splice(0)) {
    try { if (project && !project.repo.destroyed) await project.destroy() }
    finally { await rm(directory, { recursive: true, force: true }) }
  }
})

describe('real filesystem reads of Git-conflicted card metadata', () => {
  it.each([false, true])('preserves conflict bytes during project init (watched=%s) while clean cards still normalize', async watched => {
    const f = await fixture({ watched, initiallyConflicted: true })
    const clean = await readFile(f.ordinaryPath)
    expect(clean.equals(ordinary)).toBe(false)
    expect(clean.toString()).toMatch(/order:-?\d+/)
    expect(await readFile(f.unrelatedPath)).toEqual(unchanged)
    expect(await readFile(f.conflictedPath)).toEqual(conflict)
  })

  it('preserves newly conflicted bytes on the current explicit repo.readFile path', async () => {
    const f = await fixture()
    await writeFile(f.conflictedPath, conflict)
    await f.repo.readFile(f.repo.getFile('conflicted.md'))
    expect(await readFile(f.unrelatedPath)).toEqual(unchanged)
    expect(await readFile(f.conflictedPath)).toEqual(conflict)
  })

  it('aggregates protected-card metadata and emits task.found during an explicit read', async () => {
    const f = await fixture()
    const found = []
    const onFound = task => found.push(task)
    f.repo.on('task.found', onFound)
    try {
      await writeFile(f.conflictedPath, conflict)
      await f.repo.readFile(f.repo.getFile('conflicted.md'))
      const task = f.repo.getTasks().find(task => task.allMeta.protectedkey)
      expect(task?.allMeta.protectedkey).toEqual(['protectedvalue'])
      expect(task.allTags).toContain('protectedtag')
      expect(task.allContext).toContain('protectedcontext')
      expect.soft(f.repo.allMeta.protectedkey).toEqual(['protectedvalue'])
      expect.soft(f.repo.allTags.has('protectedtag')).toBe(true)
      expect.soft(f.repo.allContexts.has('protectedcontext')).toBe(true)
      expect.soft(found).toContain(task)
      expect(await readFile(f.conflictedPath)).toEqual(conflict)
    } finally {
      f.repo.removeListener('task.found', onFound)
    }
  })

  it('preserves external conflicts introduced after transformation but before automatic writeback', async () => {
    const f = await fixture()
    const file = f.repo.getFile('conflicted.md')
    const transform = file.transformTasks
    const transformed = vi.spyOn(file, 'transformTasks').mockImplementation(function (config) {
      const result = transform.call(this, config)
      writeFileSync(f.conflictedPath, conflict)
      return result
    })
    try {
      await writeFile(f.conflictedPath, '# #TODO Newly saved clean card awaiting normalization\n')
      await f.repo.readFile(file)
      expect(transformed).toHaveBeenCalled()
      expect(await readFile(f.unrelatedPath)).toEqual(unchanged)
      expect(await readFile(f.conflictedPath)).toEqual(conflict)
    } finally {
      transformed.mockRestore()
    }
  })

  it('preserves externally saved conflict bytes after an actual watcher event', async () => {
    const f = await fixture({ watched: true })
    const updated = nextWatcherChange(f.repo, 'conflicted.md')
    await writeFile(f.conflictedPath, conflict)
    await updated
    expect(await readFile(f.unrelatedPath)).toEqual(unchanged)
    expect(await readFile(f.conflictedPath)).toEqual(conflict)
  })

  it('resumes ordinary normalization after the user removes every conflict marker', async () => {
    const f = await fixture({ watched: true })
    const conflicted = nextWatcherChange(f.repo, 'conflicted.md')
    await writeFile(f.conflictedPath, conflict)
    await conflicted
    const resolved = '# #TODO User-resolved card without order metadata\n'
    const updated = nextWatcherChange(f.repo, 'conflicted.md')
    await writeFile(f.conflictedPath, resolved)
    await updated
    await vi.waitFor(async () => {
      const bytes = await readFile(f.conflictedPath)
      expect(bytes.equals(Buffer.from(resolved))).toBe(false)
      expect(bytes.toString()).toMatch(/order:-?\d+/)
      expect(bytes.toString()).not.toMatch(/<<<<<<<|=======|>>>>>>>/)
      expect(f.repo.getTasks().some(task => task.text.includes('User-resolved card'))).toBe(true)
    })
    expect(await readFile(f.unrelatedPath)).toEqual(unchanged)
  })
})
