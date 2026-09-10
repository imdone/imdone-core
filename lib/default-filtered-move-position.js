function sameTask(left, right) {
  return Boolean(left && right && left.equals(right))
}

export function resolveDefaultFilteredMovePosition({
  task,
  newList,
  newPosition,
  filteredCards,
  repositoryListCards,
}) {
  const visibleDestinationCards = filteredCards
    .filter(candidate => candidate.list === newList && !sameTask(candidate, task))

  if (!Number.isInteger(newPosition)
    || newPosition < 0
    || newPosition > visibleDestinationCards.length) {
    throw new RangeError(`Filtered task position is outside ${newList}: ${newPosition}`)
  }

  const destinationCards = repositoryListCards
    .filter(candidate => !sameTask(candidate, task))
  if (visibleDestinationCards.length === 0) return destinationCards.length

  const anchor = visibleDestinationCards[
    Math.min(newPosition, visibleDestinationCards.length - 1)
  ]
  const anchorPosition = destinationCards.findIndex(candidate => sameTask(candidate, anchor))
  if (anchorPosition < 0) {
    throw new Error(`Filtered task is missing from ${newList}: ${anchor.id}`)
  }

  return newPosition < visibleDestinationCards.length
    ? anchorPosition
    : anchorPosition + 1
}
