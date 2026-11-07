import type { CommandEnvelope } from '@/domain/commands';
import { moneyCents } from '@/domain/money';

import { commitCommand, type Committed } from './commitCommand';
import type { Committer, GamePorts } from './game';
import { tapBoost } from './tapBoost';

function grantActivation(ports: GamePorts, core: Committer) {
  return () =>
    core.commit((current, time): Promise<Committed> => {
      const { boost } = current.reward;
      if (boost.status !== 'pending') {
        return Promise.resolve({
          outcome: { ok: true, revision: current.revision, cashChangeCents: moneyCents(0) },
        });
      }
      const envelope: CommandEnvelope = {
        id: `activate-${boost.grantId}`,
        command: { type: 'ActivateBoost' },
      };
      return commitCommand(ports, { current, envelope, time });
    });
}

export function rewardedBoost(
  ports: GamePorts,
  game: { core: Committer; flushTaps: () => Promise<void> },
) {
  const { core } = game;
  const activatePendingGrant = grantActivation(ports, core);
  const boost = tapBoost({
    ad: ports.ads.rewarded,
    createId: ports.createId,
    snapshots: core.snapshots,
    boostTime: core.boostTime,
    flushTaps: game.flushTaps,
    recordReward: (presentationId) =>
      void core.run({
        id: `reward-${presentationId}`,
        command: { type: 'RecordAdReward', presentationId },
      }),
    activatePendingGrant: () => void activatePendingGrant(),
    requested: (request) => core.telemetry.adRequested(request, core.snapshots.get().state),
  });
  return { boost, activatePendingGrant };
}
