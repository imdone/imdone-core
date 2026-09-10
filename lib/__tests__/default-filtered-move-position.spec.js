import { describe, expect, it } from 'vitest'
import { resolveDefaultFilteredMovePosition } from '../default-filtered-move-position'

function card(id, list = 'TODO') {
  return {
    id,
    list,
    equals(other) {
      return this.id === other?.id
    },
  }
}

describe('resolveDefaultFilteredMovePosition', () => {
  const moving = card('moving', 'BACKLOG')
  const first = card('first')
  const hidden = card('hidden')
  const second = card('second')

  it.each([
    {
      label: 'start before the first visible neighbor while preserving a hidden prefix',
      newPosition: 0,
      filteredCards: [first, second],
      repositoryListCards: [hidden, first, second],
      expected: 1,
    },
    {
      label: 'middle before the next visible neighbor',
      newPosition: 1,
      filteredCards: [first, second],
      repositoryListCards: [first, hidden, second],
      expected: 2,
    },
    {
      label: 'end after the final visible neighbor',
      newPosition: 2,
      filteredCards: [first, second],
      repositoryListCards: [first, hidden, second],
      expected: 3,
    },
    {
      label: 'empty visible destination after its hidden cards',
      newPosition: 0,
      filteredCards: [],
      repositoryListCards: [hidden],
      expected: 1,
    },
  ])('resolves $label', ({ newPosition, filteredCards, repositoryListCards, expected }) => {
    expect(resolveDefaultFilteredMovePosition({
      task: moving,
      newList: 'TODO',
      newPosition,
      filteredCards,
      repositoryListCards,
    })).toBe(expected)
  })

  it('removes the moving card before resolving a same-list end position', () => {
    expect(resolveDefaultFilteredMovePosition({
      task: first,
      newList: 'TODO',
      newPosition: 1,
      filteredCards: [first, second],
      repositoryListCards: [first, hidden, second],
    })).toBe(2)
  })

  it.each([-1, 2, 1.5])('rejects invalid visible position %s', (newPosition) => {
    expect(() => resolveDefaultFilteredMovePosition({
      task: moving,
      newList: 'TODO',
      newPosition,
      filteredCards: [first],
      repositoryListCards: [first],
    })).toThrow(/position is outside/i)
  })

  it('rejects a visible card missing from the repository list', () => {
    expect(() => resolveDefaultFilteredMovePosition({
      task: moving,
      newList: 'TODO',
      newPosition: 0,
      filteredCards: [first],
      repositoryListCards: [hidden],
    })).toThrow(/filtered task is missing/i)
  })
})
