import { beforeEach, describe, expect, it } from 'vitest'
import { appContext as context } from '../../../context/ApplicationContext.js'
import { getDefaultView, getView, getViews } from '../GetViewsUsecase.js'
import { View } from '../../entities/View.js'

describe('GetViewsUsecase', () => {
  beforeEach(() => {
    context().repo = {
      config: {
        defaultFilter: '+default',
        lists: [
          { id: 'todo', name: 'TODO' },
          { id: 'doing', name: 'DOING', hidden: true },
        ],
        views: [],
      },
    }
  })

  it('builds the default view from the current config', () => {
    const view = getDefaultView()

    expect(view).toBeInstanceOf(View)
    expect(view.id).toBe(View.DEFAULT_VIEW_ID)
    expect(view.name).toBe(View.DEFAULT_VIEW_NAME)
    expect(view.filter).toBe('+default')
    expect(view.isModifiable).toBe(false)
    expect(view.lists.map(list => list.toConfig())).toEqual([
      { id: 'todo', name: 'TODO', hidden: false, ignore: false },
      { id: 'doing', name: 'DOING', hidden: true, ignore: false },
    ])
    expect(view.lists.every(list => list.tasks === undefined)).toBe(true)
  })

  it('returns the default view followed by synchronized custom views', () => {
    context().repo.config.views = [
      {
        id: 'mine',
        name: 'Mine',
        filter: '+me',
        lists: [
          { id: 'todo', name: 'TODO', filter: '+owner' },
          { id: 'done', name: 'DONE' },
        ],
      },
      {
        id: 'readonly',
        name: 'Readonly',
        filter: '',
        lists: [],
        modifiable: false,
      },
    ]

    const views = getViews()

    expect(views).toHaveLength(3)
    expect(views[1].id).toBe('mine')
    expect(views[1].isModifiable).toBe(true)
    expect(views[1].lists.map(list => ({ ...list }))).toEqual([
      { id: 'todo', name: 'TODO', filter: '+owner' },
      { id: 'doing', name: 'DOING', hidden: true, ignore: false, tasks: [] },
    ])
    expect(views[2].id).toBe('readonly')
    expect(views[2].isModifiable).toBe(false)
  })

  it('finds a view by id', () => {
    context().repo.config.views = [
      { id: 'mine', name: 'Mine', filter: '+me', lists: [] },
    ]

    expect(getView('mine')?.name).toBe('Mine')
    expect(getView('missing')).toBeUndefined()
  })
})
