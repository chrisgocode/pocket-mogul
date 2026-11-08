import type { BalanceRun } from './simulation';
import { formatMoneyExact, moneyCents } from '@/domain/money';

export function deepReport(runs: readonly BalanceRun[]): string[] {
  return [
    '## Deep businesses',
    '',
    'Incident losses below are direct treasury losses, excluding lost income from capacity and cost incidents. Closures count every event, including during offline settlement.',
    '',
    '| Run | Business | Stage | Units | Staff (operations/sales/manager) | Treasury | Status | Closures | Incidents | Direct incident losses |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...runs.flatMap((run) =>
      run.businesses.map((owned) => {
        const events = run.events.filter(
          (event) => 'assetId' in event && event.assetId === owned.definitionId,
        );
        const incidents = events.filter((event) => event.kind === 'incident');
        const losses = moneyCents(
          -incidents.reduce((sum, event) => sum + event.treasuryChangeCents, 0n),
        );
        return `| ${run.scenario.name}, ${run.scenario.policy} | ${owned.definitionId} | ${owned.stage} | ${owned.units} | ${owned.staff.operations}/${owned.staff.sales}/${owned.staff.manager} | ${formatMoneyExact(owned.treasuryCents)} | ${owned.status} | ${events.filter((event) => event.kind === 'closure').length} | ${incidents.length} | ${formatMoneyExact(losses)} |`;
      }),
    ),
    '',
  ];
}

export function actionReport(runs: readonly BalanceRun[]): string[] {
  return [
    '## Accepted operating actions',
    '',
    '| Run | Command | Count |',
    '| --- | --- | --- |',
    ...runs.flatMap((run) =>
      Object.entries(run.actions)
        .filter(
          ([command]) =>
            !['TapBatch', 'AdvanceTime', 'SettleOffline', 'AcknowledgeReturnSummary'].includes(
              command,
            ),
        )
        .map(
          ([command, count]) =>
            `| ${run.scenario.name}, ${run.scenario.policy} | ${command} | ${count} |`,
        ),
    ),
    '',
  ];
}
