import { describe, it, expect } from 'vitest';
import { setNoDST, getIsoDateWithOffset } from '../date-time';

const ciSkip = process.env.GITHUB_ACTION ? describe.skip : describe;

ciSkip('getIsoDateWithOffset', () => {
  it('respects noDST setting', () => {
    const date = new Date('2021-06-01T12:00:00-04:00');
    setNoDST(true);
    expect(getIsoDateWithOffset(date)).to.equal('2021-06-01T11:00:00-05:00');
    setNoDST(false);
    expect(getIsoDateWithOffset(date)).to.equal('2021-06-01T12:00:00-04:00');
  })
})