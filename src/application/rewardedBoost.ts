import { adOfferRefusal } from '@/domain/adRewardEffects';
import { holdsEntitlement } from '@/domain/entitlements';
import type { CommandEnvelope } from '@/domain/commands';
import { moneyCents } from '@/domain/money';

import { commitCommand, type Committed } from './commitCommand';
import { adRewardEconomy } from './economy';
import type { Committer, GamePorts } from './game';
import { tapBoost, type RewardedView } from './tapBoost';

function grantActivation(ports: GamePorts, core: Committer) {
  return () =>
    core.commit(
      (current, time): Promise<Committed> => {
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
      },
      { retryUntilSaved: true },
    );
}

function rewardCommand({ id, offer }: RewardedView): CommandEnvelope {
  if (offer.kind === 'tap_boost')
    return { id: `reward-${id}`, command: { type: 'RecordAdReward', presentationId: id } };
  return { id: `ad-reward-${id}`, command: { type: 'ClaimAdReward', presentationId: id, offer } };
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
    recordReward: (view) => void core.run(rewardCommand(view)),
    canClaim: (offer) =>
      adOfferRefusal(core.snapshots.get().state, {
        offer,
        economy: adRewardEconomy(ports.content),
      }) === undefined,
    adFree: () => holdsEntitlement(core.snapshots.get().state, 'vipPass'),
    activatePendingGrant: () => void activatePendingGrant(),
    requested: (request) => core.telemetry.adRequested(request, core.snapshots.get().state),
  });
  return { boost, activatePendingGrant };
}
