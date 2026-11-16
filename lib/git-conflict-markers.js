const MARKER = /^(?:<{7,}|>{7,}|\|{7,})(?:[ \t].*)?\r?$/m

export function hasGitConflictMarkers(content) {
  return typeof content === 'string' && MARKER.test(content)
}
