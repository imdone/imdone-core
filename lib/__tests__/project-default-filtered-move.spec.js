import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { Config } from '../config'
import { createFileSystemProject } from '../project-factory'

const projects = []

async function createFilteredProject(cards = [
  { file: 'first.md', title: 'First card', list: 'TODO', order: 10 },
  { file: 'hidden.md', title: 'Hidden card', list: 'TODO', order: 15, commentsOn: 'SCRUM-1' },
  { file: 'second.md', title: 'Second card', list: 'TODO', order: 20 },
]) {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'imdone-filtered-move-'))
  const config = Config.newDefaultConfig({
    settings: {
      defaultFilter: 'allMeta.commentsOn!=*',
      cards: {
        defaultList: 'TODO',
        orderMeta: true,
      },
    },
  })
  for (const card of cards) {
    const commentsOn = card.commentsOn ? `\ncommentsOn:${card.commentsOn}` : ''
    await writeFile(
      path.join(projectPath, card.file),
      `## [${card.title}](#${card.list}:${card.order})\n\n<!--${commentsOn}\n-->\n`,
    )
  }

  const project = createFileSystemProject({
    path: projectPath,
    config,
    loadInstalledPlugins: () => {},
    loadPluginsNotInstalled: () => {},
  })
  projects.push({ project, projectPath })
  await project.init()
  return project
}

afterEach(async () => {
  for (const { project, projectPath } of projects.splice(0)) {
    await project.destroy()
    await rm(projectPath, { recursive: true, force: true })
  }
})

describe('Project default-filtered movement', () => {
  it('preserves the existing full-list position contract of moveTask', async () => {
    const project = await createFilteredProject()
    const first = project.repo.getTasksInList('TODO')[0]

    await project.moveTask(first, 'TODO', 1)

    expect(project.repo.getTasksInList('TODO').map(({ text }) => text)).toEqual([
      'Hidden card',
      'First card',
      'Second card',
    ])
  })

  it('moves a card to a position in the default-filtered projection', async () => {
    const project = await createFilteredProject()
    const first = project.repo.getTasksInList('TODO')[0]

    await project.moveTaskInDefaultFilteredCards(first, 'TODO', 1)

    expect(project.getDefaultFilteredCards().map(({ text }) => text)).toEqual([
      'Second card',
      'First card',
    ])
  })

  it('moves a card to a visible position in another filtered list', async () => {
    const project = await createFilteredProject([
      { file: 'first.md', title: 'First card', list: 'TODO', order: 10 },
      { file: 'hidden.md', title: 'Hidden destination card', list: 'DOING', order: 15, commentsOn: 'SCRUM-1' },
      { file: 'target.md', title: 'Visible destination card', list: 'DOING', order: 20 },
    ])
    const first = project.repo.getTasksInList('TODO')[0]

    await project.moveTaskInDefaultFilteredCards(first, 'DOING', 1)

    expect(project.getDefaultFilteredCards()
      .filter(({ list }) => list === 'DOING')
      .map(({ text }) => text)).toEqual([
      'Visible destination card',
      'First card',
    ])
  })
})
