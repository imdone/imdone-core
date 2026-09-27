// Derived from imdone/node-monquery 0.2.2, originally visionmedia/node-monquery.
// Retained under the MIT license used by both projects.
import assert from 'node:assert'

export function compile(node) {
  switch (node.type) {
    case 'field': {
      const value = node.cmp
        ? { [`$${node.cmp}`]: node.value }
        : node.value
      return { [node.name]: value }
    }
    case 'op':
      return {
        [`$${node.op}`]: [compile(node.left), compile(node.right)],
      }
    default:
      return undefined
  }
}

function comparison(value) {
  switch (value) {
    case '>': return 'gt'
    case '<': return 'lt'
    case '<=': return 'lte'
    case '>=': return 'gte'
    case '!=': return 'ne'
    default: return null
  }
}

function numeric(value) {
  return !Number.isNaN(Number.parseFloat(value))
}

function quoted(value) {
  return value[0] === "'" || value[0] === '"'
}

function pattern(value) {
  const escaped = value
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/-/g, '\\x2d')
    .replace(/\\\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

function coerce(value) {
  if (typeof value !== 'string') return value
  if (value[0] === '/') return new RegExp(value.slice(1, -1))
  if (value === 'true' || value === 'yes') return true
  if (value === 'false' || value === 'no') return false
  if (quoted(value)) return value.replace(/^['"]|['"]$/g, '')
  if (value.includes('*')) return pattern(value)
  return value
}

export function parse(input) {
  let source = `(${input.trim()})`

  const requireSyntax = (condition, message) => {
    if (condition) return
    assert.fail(`${message} near \`${source.slice(0, 10)}\``)
  }

  const field = () => {
    const nameMatch = source.match(/^([-.\w]+)/)
    if (!nameMatch) return undefined

    const name = nameMatch[0]
    source = source.slice(name.length)
    const valueMatch = source.match(/ *([:><!=]*) *([-*\w.]+|".*?"|'.*?'|\/(.*)\/) */)
    let value = true
    let operator = null
    if (valueMatch) {
      source = source.slice(valueMatch[0].length)
      value = valueMatch[2]
      operator = comparison(valueMatch[1])
      if (numeric(value)) value = Number.parseFloat(value)
    }

    return {
      type: 'field',
      name,
      value: coerce(value),
      ...(operator ? { cmp: operator } : {}),
    }
  }

  const expression = () => {
    requireSyntax(source[0] === '(', "missing opening '('")
    source = source.slice(1)
    const node = binaryOperation()
    requireSyntax(source[0] === ')', "missing closing ')'")
    source = source.slice(1)
    return node
  }

  const primary = () => field() || expression()

  const binaryOperation = () => {
    const left = primary()
    const operatorMatch = source.match(/^ *(OR|AND) */i)
    if (!operatorMatch) return left
    source = source.slice(operatorMatch[0].length)
    return {
      type: 'op',
      op: operatorMatch[1].toLowerCase(),
      left,
      right: binaryOperation(),
    }
  }

  return expression()
}

export default function monquery(input) {
  return compile(parse(input))
}
