import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { setNoDST, getIsoDateWithOffset } from '../date-time';

describe('getIsoDateWithOffset', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'America/New_York');
  })

  afterEach(() => {
    vi.unstubAllEnvs();
    setNoDST(false);
  })

  it('respects noDST setting', () => {
    const date = new Date('2021-06-01T12:00:00-04:00');
    setNoDST(true);
    expect(getIsoDateWithOffset(date)).to.equal('2021-06-01T11:00:00-05:00');
    setNoDST(false);
    expect(getIsoDateWithOffset(date)).to.equal('2021-06-01T12:00:00-04:00');
  })
})
