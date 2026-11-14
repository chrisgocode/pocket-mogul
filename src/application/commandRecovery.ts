import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';

import type { CommandTime } from './commitCommand';

type Attempt = {
  readonly retryUntilSaved: boolean;
  readonly perform: (ownTurn: boolean) => Promise<CommandOutcome>;
};

type Result = { readonly outcome: CommandOutcome; readonly blocked: boolean };

const SAVED_FOR_CERTAIN = new Set<CommandEnvelope['command']['type']>([
  'SettleOffline',
  'RecordAdReward',
  'ActivateBoost',
  'ClaimAdReward',
]);

export function retryUntilSaved(envelope: CommandEnvelope): boolean {
  const { type } = envelope.command;
  return SAVED_FOR_CERTAIN.has(type);
}

export function recoveryAttempt(read: () => CommandTime): () => CommandTime {
  let time: CommandTime | undefined;
  return () => {
    time ??= read();
    return time;
  };
}

export function commandRecovery() {
  let pending: readonly Attempt[] = [];
  const recover = (current: Attempt): Promise<CommandOutcome | undefined> =>
    pending.reduce<Promise<CommandOutcome | undefined>>(async (previous, attempt) => {
      const latest = await previous;
      if (latest !== undefined && !latest.ok && latest.error === 'SAVE_FAILED') return latest;
      const outcome = await attempt.perform(attempt === current);
      if (!outcome.ok && outcome.error === 'SAVE_FAILED') return outcome;
      pending = pending.filter((other) => other !== attempt);
      return outcome;
    }, Promise.resolve(undefined));
  return {
    async run(attempt: Attempt): Promise<Result> {
      const retained = attempt.retryUntilSaved;
      if (retained) pending = [...pending, attempt];
      const recovered = await recover(attempt);
      if (recovered !== undefined && !recovered.ok && recovered.error === 'SAVE_FAILED') {
        return { outcome: recovered, blocked: !retained };
      }
      if (retained && recovered !== undefined) return { outcome: recovered, blocked: false };
      return { outcome: await attempt.perform(true), blocked: false };
    },
  };
}
