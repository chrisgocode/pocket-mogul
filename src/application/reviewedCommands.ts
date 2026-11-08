import type { GameCommand } from '@/domain/commands';

export function reviewedFinancialCommand(command: GameCommand, revision: number): GameCommand {
  if (command.type === 'FileTaxReturn') return { ...command, revision };
  if (
    command.type === 'SellBusiness' ||
    command.type === 'SellProperty' ||
    command.type === 'WithdrawFromTreasury' ||
    command.type === 'ExecuteTrade'
  )
    return { ...command, quotedRevision: revision };
  return command;
}

export function hasFinancialReview(command: GameCommand): boolean {
  return 'quotedRevision' in command && command.quotedRevision !== undefined;
}
