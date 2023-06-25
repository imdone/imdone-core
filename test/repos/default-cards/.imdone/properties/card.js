module.exports = function ({ line, source, totals }) {
  return {
    date: `${new Date().toISOString().substring(0, 10)}`,
    timestamp: `${new Date().toISOString()}`,
    sourceLink: `[${source.path}:${line}](${source.path}:${line})`,
    dueEmoji: dueEmoji(totals),
    recentEmoji: recentEmoji(totals),
    wipEmoji: wipEmoji(totals),
    cardTotal: cardTotal(totals),
  }
}

const EMOJI = {
  BAD: ':rotating_light:',
  GREAT: ':rocket:',
  SLEEP: ':sleeping:',
  GOOD: ':2nd_place_medal:',
}

function formatEmoji(emoji) {
  return `<span style="font-size: 1.5em;">${emoji}</span>`
}

function dueEmoji(totals) {
  const due = totals["What's Due?"]
  let emoji = EMOJI.GOOD
  if (due >= 3) {
    emoji = EMOJI.BAD
  } else if (due === 0) {
    emoji = EMOJI.GREAT
  }
  return formatEmoji(emoji)
}

function recentEmoji(totals) {
  const recentlyCompleted = totals['Recently Completed']
  let emoji = EMOJI.GOOD
  if (recentlyCompleted >= 3) {
    emoji = EMOJI.GREAT
  } else if (recentlyCompleted === 0) {
    emoji = EMOJI.BAD
  }
  return formatEmoji(emoji)
}

function wipEmoji(totals) {
  const doing = totals['DOING']
  let emoji = EMOJI.GOOD
  if (doing >= 3) {
    emoji = EMOJI.BAD
  } else if (doing === 0) {
    emoji = EMOJI.SLEEP
  } else if (doing === 1) {
    emoji = EMOJI.GREAT
  }
  return formatEmoji(emoji)
}

function cardTotal(totals) {
  let count = 0
  Object.keys(totals).forEach((list) => {
    count += totals[list]
  })
  return count
}
