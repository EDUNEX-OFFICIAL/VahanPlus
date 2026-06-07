import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { candidateWins, districtEntityKey, consignerEntityKey } from '../src/semantics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(readFileSync(join(__dirname, 'golden/vectors.json'), 'utf8'));

describe('candidateWins golden vectors', () => {
  for (const v of vectors.winnerFunction) {
    it(v.name, () => {
      const c = {
        reportDate: v.candidate.reportDate,
        scrapedAt: new Date(v.candidate.scrapedAt),
      };
      const i = {
        reportDate: v.incumbent.reportDate,
        scrapedAt: new Date(v.incumbent.scrapedAt),
      };
      const wins = candidateWins(c, i);
      if (v.expect === 'candidate') assert.equal(wins, true);
      else assert.equal(wins, false);
    });
  }
});

describe('entity keys', () => {
  it('districtEntityKey', () => {
    for (const v of vectors.districtEntityKey) {
      assert.equal(districtEntityKey(v.dmoName), v.expect);
    }
  });

  it('consignerEntityKey', () => {
    for (const v of vectors.consignerEntityKey) {
      assert.equal(
        consignerEntityKey({
          dmoName: v.dmoName,
          operatorType: v.operatorType,
          consignerName: v.consignerName,
        }),
        v.expect,
      );
    }
  });
});
