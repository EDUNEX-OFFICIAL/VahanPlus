import {
  isReportDateInRange,
  parseDateFlexible,
  reportDateLookupVariantsInIsoRange,
} from '../src/utils/epassDates.js';

describe('reportDateLookupVariantsInIsoRange', () => {
  it('includes portal, numeric, and ISO variants per day', () => {
    const variants = reportDateLookupVariantsInIsoRange('2026-04-01', '2026-04-02');
    expect(variants).toContain('01-Apr-2026');
    expect(variants).toContain('01-04-2026');
    expect(variants).toContain('2026-04-01');
    expect(variants).toContain('02-Apr-2026');
    expect(variants).toContain('2026-04-02');
  });
});

describe('isReportDateInRange', () => {
  it('accepts ISO stored report dates in range', () => {
    expect(isReportDateInRange('2026-04-15', '2026-04-01', '2026-06-05')).toBe(true);
  });

  it('accepts portal stored report dates in range', () => {
    expect(isReportDateInRange('05-Jun-2026', '2026-04-01', '2026-06-05')).toBe(true);
  });

  it('rejects dates outside range', () => {
    expect(isReportDateInRange('2026-03-31', '2026-04-01', '2026-06-05')).toBe(false);
  });
});

describe('parseDateFlexible', () => {
  it('parses ISO report dates', () => {
    const d = parseDateFlexible('2026-04-01');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(3);
    expect(d?.getDate()).toBe(1);
  });
});
