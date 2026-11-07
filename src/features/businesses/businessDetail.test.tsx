import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState, type BusinessLevels } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const NO_LEVELS: BusinessLevels = { capacity: 0, quality: 0, efficiency: 0 };

async function openVending(
  cash: string,
  { levels = NO_LEVELS, initialUrl = '/businesses/vending' } = {},
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
    businesses: [
      {
        definitionId: 'vending',
        levels,
        managerOwned: false,
        capitalizedSpendCents: dollars('250'),
      },
    ],
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const netProfit = () => screen.getByLabelText(/^Net profit/);
const sheet = () => screen.getByRole('header', { name: /^(Upgrade|Hire|Sell)/ });
const confirm = () => fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));

describe('Business details', () => {
  it('shows revenue, costs, bonuses, net profit and branch art (BUS05)', async () => {
    await openVending('0', { levels: { capacity: 5, quality: 5, efficiency: 5 } });
    expect(screen.getByLabelText('Revenue, $31.50/min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Operating costs, -$4.68/min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Milestone bonus, +10%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Manager bonus, Not hired')).toBeOnTheScreen();
    expect(netProfit()).toHaveAccessibleName('Net profit, $29.50/min');
    expect(screen.getByLabelText('2 branches')).toBeOnTheScreen();
  });

  it('confirms the first Capacity upgrade and nets $11.16 per minute (AC07)', async () => {
    await openVending('60');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Upgrade Capacity, +$1.16/min, Upgrade · $50.00' }),
    );
    expect(sheet()).toHaveTextContent('Upgrade Capacity');
    expect(screen.getByText('-$50.00')).toBeOnTheScreen();
    expect(screen.getByText('$10.00/min → $11.16/min')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByLabelText('Net profit, $11.16/min')).toBeOnTheScreen();
    expect(screen.getByText('Capacity 1/20')).toBeOnTheScreen();
  });

  it('shows what each upgrade still needs and the manager price', async () => {
    await openVending('40');
    expect(screen.getByRole('button', { name: /^Upgrade Capacity/ })).toBeDisabled();
    expect(screen.getByText('Need $10.00 more')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Hire manager/ })).toBeDisabled();
    expect(screen.getByText('Need $460.00 more')).toBeOnTheScreen();
  });

  it('hires the manager once for 10% more net profit (BUS03)', async () => {
    await openVending('500');
    await fireEvent.press(screen.getByRole('button', { name: /^Hire manager/ }));
    expect(screen.getByText('-$500.00')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByLabelText('Net profit, $11.00/min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Manager bonus, +10%')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Hire manager/ })).not.toBeOnTheScreen();
  });

  it('sells for 60% of purchase and upgrade spending (BUS06)', async () => {
    await openVending('0');
    await fireEvent.press(screen.getByRole('button', { name: /^Sell Vending Machine/ }));
    expect(screen.getByText('+$150.00')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByText("You don't own Vending Machine")).toBeOnTheScreen();
  });
});

describe('Businesses catalog', () => {
  it('opens details from an owned business and previews the next Tier', async () => {
    await openVending('100', { initialUrl: '/businesses' });
    expect(screen.getByText('Next: Tier 2 at $5,000.00 peak net worth')).toBeOnTheScreen();
    expect(screen.getByText('$4,650.00 to go')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Manage Vending Machine' }));
    expect(await screen.findByLabelText('Net profit, $10.00/min')).toBeOnTheScreen();
  });
});
