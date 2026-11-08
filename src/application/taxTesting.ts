import { TAX_READER_VERSION, type TaxLedger } from '@/domain/tax/types';
import { getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import {
  closeTaxDay,
  closeTaxReturn,
  recordWholeTaxReceipt,
  startTaxLedger,
} from '@/domain/tax/ledger';

export function taxReturnOwner(seed = 'audit-test'): GameState & { readonly tax: TaxLedger } {
  const content = getContent();
  const dayMs = content.economy.businessRules.dayMs;
  const rules = content.economy.taxes!;
  const ledger = startTaxLedger({ atMs: 0, wealthCents: dollars('50000'), dayMs }, rules);
  const earned = recordWholeTaxReceipt(ledger, {
    source: 'capital',
    grossCents: dollars('25000'),
    profitCents: dollars('25000'),
  });
  const tax = closeTaxReturn(closeTaxDay(earned), { dayMs, rules });
  const simulationMs = rules.returnDays * dayMs;
  return {
    ...freshGameState({ saveId: seed, economyVersion: content.economyVersion, wallMs: 0 }),
    cashCents: dollars('2000'),
    minReaderVersion: TAX_READER_VERSION,
    clock: { simulationMs, lastWallCheckpointMs: 0 },
    tax: { ...tax, dayEndsMs: simulationMs + dayMs },
  };
}
