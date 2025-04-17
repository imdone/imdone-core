export function cloneDeep(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj

  if (seen.has(obj)) return seen.get(obj)

  if (typeof obj === 'function') return obj

  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof RegExp) return new RegExp(obj)
  if (obj instanceof Map) {
    const result = new Map()
    seen.set(obj, result)
    for (const [key, value] of obj.entries()) {
      result.set(cloneDeep(key, seen), cloneDeep(value, seen))
    }
    return result
  }

  if (obj instanceof Set) {
    const result = new Set()
    seen.set(obj, result)
    for (const value of obj.values()) {
      result.add(cloneDeep(value, seen))
    }
    return result
  }

  const result = Array.isArray(obj) ? [] : {}
  seen.set(obj, result)

  for (const key of Object.keys(obj)) {
    result[key] = cloneDeep(obj[key], seen)
  }

  return result
}
