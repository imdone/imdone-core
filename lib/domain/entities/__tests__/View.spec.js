import { describe, expect, it } from 'vitest'
import { View } from '../View.js'

describe('View', () => {
  it('requires a name', () => {
    expect(() => new View({ id: 'board' })).toThrow('Name is a required field')
  })

  it('uses default filter, lists, and modifiable values', () => {
    const view = new View({ id: 'board', name: 'Board' })

    expect(view.id).toBe('board')
    expect(view.name).toBe('Board')
    expect(view.filter).toBe('')
    expect(view.lists).toEqual([])
    expect(view.isModifiable).toBe(false)
  })

  it('exposes the configured values', () => {
    const lists = [{ id: 'todo', name: 'TODO' }]
    const view = new View({
      id: 'custom',
      name: 'Custom',
      filter: '+tag',
      lists,
      modifiable: true,
    })

    expect(view.id).toBe('custom')
    expect(view.name).toBe('Custom')
    expect(view.filter).toBe('+tag')
    expect(view.lists).toBe(lists)
    expect(view.isModifiable).toBe(true)
  })
})
