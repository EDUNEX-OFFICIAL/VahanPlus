import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregateMinerals } from './epass-aggregate';
import type { EpassDistrictRowDto } from './epass-types';

function districtRow(
  overrides: Partial<EpassDistrictRowDto> & Pick<EpassDistrictRowDto, 'id'>,
): EpassDistrictRowDto {
  return {
    snapshotId: 'snap-1',
    slNo: 1,
    dmoName: 'Patna',
    dmoId: null,
    operators: {
      lessee: { mineral: 'SAND', users: 10, passes: 100, dispatchedQty: 50, passDetailUrl: null },
      dealer: { mineral: 'STONE', users: 5, passes: 20, dispatchedQty: 10, passDetailUrl: null },
    },
    lesseeMineral: 'SAND',
    dealerMineral: 'STONE',
    lesseeUsers: 10,
    lesseePasses: 100,
    lesseeDispatchedQty: 50,
    dealerUsers: 5,
    dealerPasses: 20,
    dealerDispatchedQty: 10,
    totalUsers: 15,
    totalPasses: 120,
    lesseeMineralId: null,
    dealerMineralId: null,
    lesseePassDetailUrl: null,
    dealerPassDetailUrl: null,
    ...overrides,
  };
}

describe('aggregateMinerals', () => {
  it('sums district rows by mineral across lessee and dealer roles', () => {
    const rows = [
      districtRow({
        id: 'r1',
        lesseeMineral: 'SAND',
        lesseeUsers: 10,
        lesseePasses: 100,
        lesseeDispatchedQty: 50,
        dealerMineral: 'STONE',
        dealerUsers: 5,
        dealerPasses: 20,
        dealerDispatchedQty: 10,
        totalPasses: 120,
      }),
      districtRow({
        id: 'r2',
        dmoName: 'Gaya',
        lesseeMineral: 'SAND',
        lesseeUsers: 3,
        lesseePasses: 30,
        lesseeDispatchedQty: 15,
        dealerMineral: 'STONE',
        dealerUsers: 2,
        dealerPasses: 8,
        dealerDispatchedQty: 4,
        totalPasses: 38,
      }),
    ];

    const result = aggregateMinerals(rows);

    const sand = result.find((r) => r.mineral === 'SAND');
    const stone = result.find((r) => r.mineral === 'STONE');

    assert.ok(sand);
    assert.equal(sand.lessee.users, 13);
    assert.equal(sand.lessee.passes, 130);
    assert.equal(sand.lessee.dispatchedQty, 65);
    assert.equal(sand.totalPasses, 130);

    assert.ok(stone);
    assert.equal(stone.dealer.users, 7);
    assert.equal(stone.dealer.passes, 28);
    assert.equal(stone.dealer.dispatchedQty, 14);
    assert.equal(stone.totalPasses, 28);

    const manualSandPasses = rows.reduce((sum, row) => sum + row.lesseePasses, 0);
    const manualStonePasses = rows.reduce((sum, row) => sum + row.dealerPasses, 0);
    assert.equal(sand.lessee.passes, manualSandPasses);
    assert.equal(stone.dealer.passes, manualStonePasses);
  });

  it('merges mineral labels that differ only by casing', () => {
    const rows = [
      districtRow({
        id: 'r1',
        lesseeMineral: 'SAND',
        lesseePasses: 40,
        dealerMineral: null,
        dealerPasses: 0,
        totalPasses: 40,
      }),
      districtRow({
        id: 'r2',
        dmoName: 'Gaya',
        lesseeMineral: 'Sand',
        lesseePasses: 10,
        dealerMineral: null,
        dealerPasses: 0,
        totalPasses: 10,
      }),
    ];

    const result = aggregateMinerals(rows);

    assert.equal(result.length, 1);
    assert.equal(result[0].mineral, 'SAND');
    assert.equal(result[0].lessee.passes, 50);
    assert.equal(result[0].totalPasses, 50);
  });

  it('respects operator filter', () => {
    const rows = [
      districtRow({
        id: 'r1',
        lesseePasses: 100,
        dealerPasses: 20,
        totalPasses: 120,
      }),
    ];

    const lesseeOnly = aggregateMinerals(rows, 'lessee');
    assert.equal(lesseeOnly.length, 1);
    assert.equal(lesseeOnly[0].mineral, 'SAND');
    assert.equal(lesseeOnly[0].totalPasses, 100);

    const dealerOnly = aggregateMinerals(rows, 'dealer');
    assert.equal(dealerOnly.length, 1);
    assert.equal(dealerOnly[0].mineral, 'STONE');
    assert.equal(dealerOnly[0].totalPasses, 20);
  });
});
