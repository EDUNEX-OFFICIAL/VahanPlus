import { resolveCrmExpiryThresholds } from '../src/services/crmConfig.js';

describe('resolveCrmExpiryThresholds', () => {
  const config = {
    insuranceExpiryDays: 10,
    rcExpiryDays: 20,
    fitnessExpiryDays: 30,
  };

  it('uses CRM config when query params are absent', () => {
    expect(resolveCrmExpiryThresholds({}, config)).toEqual({
      insuranceExpiryDays: 10,
      rcExpiryDays: 20,
      fitnessExpiryDays: 30,
    });
  });

  it('allows URL filters to override config defaults', () => {
    expect(
      resolveCrmExpiryThresholds({ insuranceExpiryDays: '5', rcExpiryDays: '15' }, config),
    ).toEqual({
      insuranceExpiryDays: 5,
      rcExpiryDays: 15,
      fitnessExpiryDays: 30,
    });
  });
});
