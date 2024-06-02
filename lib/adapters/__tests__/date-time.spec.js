const { setNoDST, getIsoDateWithOffset } = require('../date-time');

describe('getIsoDateWithOffset', () => {
  it('respects noDST setting', () => {
    const date = new Date('2021-06-01T12:00:00-04:00');
    setNoDST(true);
    should(getIsoDateWithOffset(date)).equal('2021-06-01T11:00:00-05:00');
    setNoDST(false);
    should(getIsoDateWithOffset(date)).equal('2021-06-01T12:00:00-04:00');
  })
})