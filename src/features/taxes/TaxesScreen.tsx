import { selectTaxes, orderedTaxReturns } from '@/application/taxesView';
import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { useGameSnapshot } from '@/features/game/GameContext';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameAction } from '@/features/game/useGameAction';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

import { CurrentTaxCard } from './CurrentTaxCard';
import { TaxDebtCard } from './TaxDebtCard';
import { TaxReturnCard } from './TaxReturnCard';
import { taxActionText } from './taxActionText';

const commandIdentity = (command: GameCommand) => command;

export function TaxesScreen() {
  const view = selectTaxes(useGameSnapshot(), getContent());
  const action = useGameAction(commandIdentity);
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Taxes
      </AppText>
      <AppText muted>
        {view.status === 'exempt'
          ? 'Permanent tax exemption active. No filing or tax payments are required.'
          : 'Taps and Tap Boost are exempt. The first $10,000 of wealth is protected; wealth bands blend your profit-tax rate. Returns close every six credited hours.'}
      </AppText>
      {view.lines.length === 0 && view.returns.length === 0 ? (
        <AppText>No taxable earnings yet</AppText>
      ) : null}
      <CurrentTaxCard view={view} />
      <TaxDebtCard view={view} review={action.review} />
      <Section title="Returns and audits">
        {orderedTaxReturns(view.returns).map((statement) => (
          <TaxReturnCard
            key={statement.id}
            statement={statement}
            view={view}
            review={action.review}
          />
        ))}
      </Section>
      <ActionSheet
        confirmation={action.confirmation}
        describe={(command) => taxActionText(command, view)}
        onConfirm={() => void action.confirm()}
        onCancel={action.close}
      />
    </Screen>
  );
}
