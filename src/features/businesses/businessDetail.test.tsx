import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openVending(
  cash: string,
  {
    business = {},
    initialUrl = '/businesses/vending',
  }: { business?: Partial<OwnedBusiness>; initialUrl?: string } = {},
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
    businesses: [ownedBusiness('vending', business)],
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const line = (label: string, value: string) => screen.getByLabelText(`${label}, ${value}`);
const findLine = (label: string, value: string) => screen.findByLabelText(`${label}, ${value}`);
const confirm = () => fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));

describe('Business details', () => {
  it('shows customers, price, revenue, costs and profit per business day (BUS05)', async () => {
    await openVending('0');
    expect(line('Status', 'Open · Startup')).toBeOnTheScreen();
    expect(line('Customers per day', '100 of 110 served, capacity 100')).toBeOnTheScreen();
    expect(line('Price per snack sold', '$1.40')).toBeOnTheScreen();
    expect(line('Revenue', '$140.00/day')).toBeOnTheScreen();
    expect(line('Upkeep', '-$16.00/day')).toBeOnTheScreen();
    expect(line('Customer costs', '-$24.00/day')).toBeOnTheScreen();
    expect(line('Profit', '$100.00/day')).toBeOnTheScreen();
    expect(line('To your cash', '$5.00/min')).toBeOnTheScreen();
  });

  it('marks Premium as the best price and earns $107.82 a day there (AC07)', async () => {
    await openVending('0');
    expect(screen.getByText('Best now: Premium, $107.82/day profit')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Price: Premium ★' }));
    expect(await findLine('Profit', '$107.82/day')).toBeOnTheScreen();
  });

  it('adds a machine from the treasury after confirming (BUS07, BUS10)', async () => {
    await openVending('0', { business: { treasuryCents: dollars('150') } });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a machine, +$72.16/day, Add a machine · $100.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add a machine' })).toBeOnTheScreen();
    expect(screen.getByText('-$100.00')).toBeOnTheScreen();
    await confirm();
    expect(await findLine('Treasury', '$50.00')).toBeOnTheScreen();
    expect(screen.getByText('Units 2/3')).toBeOnTheScreen();
  });

  it('shows what the treasury still needs, whatever the cash', async () => {
    await openVending('5,000', { business: { treasuryCents: dollars('40') } });
    expect(screen.getByRole('button', { name: /^Add a machine/ })).toBeDisabled();
    expect(screen.getByText('Need $60.00 more')).toBeOnTheScreen();
  });

  it('pays more to cash at a higher payout', async () => {
    await openVending('0');
    await fireEvent.press(screen.getByRole('radio', { name: 'Payout: 100%' }));
    expect(await findLine('To your cash', '$10.00/min')).toBeOnTheScreen();
  });

  it('deposits half the cash at once and withdraws all after confirming (BUS11)', async () => {
    await openVending('80');
    await fireEvent.press(screen.getByRole('button', { name: 'Deposit half your cash · $40.00' }));
    expect(await findLine('Treasury', '$40.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Withdraw all · $40.00' }));
    expect(screen.getByRole('header', { name: 'Withdraw from Vending Machine' })).toBeOnTheScreen();
    await confirm();
    expect(await findLine('Treasury', '$0.00')).toBeOnTheScreen();
  });

  it('says a closed business reopens with a deposit (BUS12)', async () => {
    await openVending('0', { business: { status: 'closed' } });
    expect(line('Status', 'Closed · Startup')).toBeOnTheScreen();
    expect(
      screen.getByText('Closed: its treasury ran out. A deposit reopens it.'),
    ).toBeOnTheScreen();
  });

  it('sells for 60% of its spending plus the whole treasury', async () => {
    await openVending('0', { business: { treasuryCents: dollars('50') } });
    await fireEvent.press(screen.getByRole('button', { name: /^Sell Vending Machine/ }));
    expect(screen.getByText('+$200.00')).toBeOnTheScreen();
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
    expect(await findLine('Profit', '$100.00/day')).toBeOnTheScreen();
  });
});
