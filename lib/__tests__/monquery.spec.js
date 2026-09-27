import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import monquery, { compile, parse } from '../monquery.js'

describe('owned monquery parser', () => {
  it('keeps the custom parser inside imdone-core with no package dependency', () => {
    const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
    const repositorySource = readFileSync(resolve('lib/repository.js'), 'utf8')

    expect(packageJson.dependencies).not.toHaveProperty('monquery')
    expect(repositorySource).toContain("import monquery from './monquery.js'")
  })

  it.each([
    ['user.name:Tobi', { type: 'field', name: 'user.name', value: 'Tobi' }],
    ['http-status:ok', { type: 'field', name: 'http-status', value: 'ok' }],
    ['failed', { type: 'field', name: 'failed', value: true }],
    ['removed:yes', { type: 'field', name: 'removed', value: true }],
    ['removed:no', { type: 'field', name: 'removed', value: false }],
    ['count:-5.2', { type: 'field', name: 'count', value: -5.2 }],
    ['type:"uploading item"', { type: 'field', name: 'type', value: 'uploading item' }],
    ['level >= 5', { type: 'field', name: 'level', value: 5, cmp: 'gte' }],
  ])('parses custom field syntax: %s', (input, expected) => {
    expect(parse(input)).toEqual(expected)
  })

  it('supports slash expressions and safely escaped wildcard patterns', () => {
    expect(parse('name:/^To/').value).toEqual(/^To/)
    const wildcard = parse('path:api.v1-*').value
    expect(wildcard).toBeInstanceOf(RegExp)
    expect(wildcard.test('api.v1-users')).toBe(true)
    expect(wildcard.test('api-v1-users')).toBe(false)
  })

  it('parses nested, case-insensitive, right-associative operators', () => {
    expect(parse('(level:error and type:upload) OR level:critical')).toEqual({
      type: 'op',
      op: 'or',
      left: {
        type: 'op', op: 'and',
        left: { type: 'field', name: 'level', value: 'error' },
        right: { type: 'field', name: 'type', value: 'upload' },
      },
      right: { type: 'field', name: 'level', value: 'critical' },
    })
    expect(parse('a:1 OR b:2 OR c:3').right).toEqual({
      type: 'op', op: 'or',
      left: { type: 'field', name: 'b', value: 2 },
      right: { type: 'field', name: 'c', value: 3 },
    })
  })

  it('compiles fields, comparisons, and nested operators', () => {
    expect(monquery('(age > 20 AND age < 50) OR gender:male')).toEqual({
      $or: [
        { $and: [{ age: { $gt: 20 } }, { age: { $lt: 50 } }] },
        { gender: 'male' },
      ],
    })
    expect(compile(parse('level != 5'))).toEqual({ level: { $ne: 5 } })
  })

  it.each([
    ['level > 5', { level: { $gt: 5 } }],
    ['level < 5', { level: { $lt: 5 } }],
    ['level <= 5', { level: { $lte: 5 } }],
    ['level >= 5', { level: { $gte: 5 } }],
    ['level != 5', { level: { $ne: 5 } }],
  ])('compiles every supported comparison: %s', (input, expected) => {
    expect(monquery(input)).toEqual(expected)
  })

  it('returns undefined for an unsupported compiler node', () => {
    expect(compile({ type: 'unsupported' })).toBeUndefined()
  })

  it.each([
    ['', /missing opening '\('/],
    ['level:error OR', /missing opening '\('/],
    ['(level:error OR type:upload', /missing closing '\)'/],
  ])('rejects malformed input: %s', (input, expected) => {
    expect(() => parse(input)).toThrow(expected)
  })
})
