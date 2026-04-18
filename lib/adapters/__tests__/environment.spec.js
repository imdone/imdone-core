import { afterEach, describe, expect, it } from 'vitest'
import { isDev } from '../environment.js'

describe('environment', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('detects development environments case-insensitively', () => {
    process.env.NODE_ENV = 'Development'

    expect(isDev()).toBe(true)
  })

  it('returns false outside development', () => {
    process.env.NODE_ENV = 'production'

    expect(isDev()).toBe(false)
  })
})
