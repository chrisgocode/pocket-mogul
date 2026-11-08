import { selectTaxes, orderedTaxReturns } from '@/application/taxesView';
import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { useGameSnapshot } from '@/features/game/GameContext';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameAction } from '@/features/game/useGameAction';
import { Screen } from '@/ui/Screen';
import { Disclosure } from '@/ui/Disclosure';
import { AppText } from '@/ui/Typography';

import { TaxCurrentSection } from './TaxCurrentSection';
import { TaxDebtCard } from './TaxDebtCard';
import { TaxReturnCard } from './TaxReturnCard';
import { taxActionText } from './taxActionText';

const commandIdentity = (command: GameCommand) => command;

export function TaxesScreen() {
  const view = selectTaxes(useGameSnapshot(), getContent());
  const action = useGameAction(commandIdentity);
  return (
    <Screen>
      {orderedTaxReturns(view.returns).map((statement) => (
        <TaxReturnCard
          key={statement.id}
          statement={statement}
          view={view}
          review={action.review}
        />
      ))}
      <TaxCurrentSection view={view} />
      <TaxDebtCard view={view} review={action.review} />
      <Disclosure title="Tax rules">
        <AppText muted>
          Taps and Tap Boost are exempt. Returns close every six credited hours. The first $10,000
          of wealth is protected when blending the profit-tax rate. Ordinary tax is paid at filing.
          Debt collects 25% of eligible credits. No interest, repeated fines or forced sales.
        </AppText>
      </Disclosure>
      <ActionSheet
        confirmation={action.confirmation}
        describe={(command) => taxActionText(command, view)}
        onConfirm={() => void action.confirm()}
        onCancel={action.close}
      />
    </Screen>
  );
}
