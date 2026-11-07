import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { renderBalanceReport, runBalance } from '@/application/balance/balanceReport';
import { DEFAULT_BALANCE_SEED } from '@/application/balance/scenarios';
import { getContent } from '@/content';

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: DEFAULT_BALANCE_SEED },
    out: { type: 'string', default: 'docs/balance-report.md' },
  },
});

const report = runBalance({ seed: values.seed, content: getContent() });
writeFileSync(values.out, renderBalanceReport(report));
process.stdout.write(`Wrote ${values.out} for seed ${values.seed}\n`);
