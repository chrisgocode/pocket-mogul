import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

const DAY_MS = 600_000;

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openVending(
  cash: string,
  {
    business = {},
    initialUrl = '/businesses/vending',
    day = 0,
  }: { business?: Partial<OwnedBusiness>; initialUrl?: string; day?: number } = {},
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
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
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
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
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(screen.getByText('Best now: Premium, $107.82/day profit')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Price: Premium ★' }));
    expect(await findLine('Profit', '$107.82/day')).toBeOnTheScreen();
  });

  it('adds a machine from the treasury after confirming (BUS07, BUS10)', async () => {
    await openVending('0', { business: { treasuryCents: dollars('150') } });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
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
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(screen.getByRole('button', { name: /^Add a machine/ })).toBeDisabled();
    expect(screen.getByText('Need $60.00 more')).toBeOnTheScreen();
  });

  it('pays more to cash at a higher payout', async () => {
    await openVending('0');
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Payout: 100%' }));
    expect(await findLine('To your cash', '$10.00/min')).toBeOnTheScreen();
  });

  it('deposits half the cash at once and withdraws all after confirming (BUS11)', async () => {
    await openVending('80');
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Deposit half your cash · $40.00' }));
    expect(await findLine('Treasury', '$40.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Withdraw all · $40.00' }));
    expect(screen.getByRole('header', { name: 'Withdraw from Vending Machine' })).toBeOnTheScreen();
    await confirm();
    expect(await findLine('Treasury', '$0.00')).toBeOnTheScreen();
  });

  it('says a closed business reopens with a deposit (BUS12)', async () => {
    await openVending('0', { business: { status: 'closed' } });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(line('Status', 'Closed · Startup')).toBeOnTheScreen();
    expect(
      screen.getByText('Closed: its treasury ran out. A deposit reopens it.'),
    ).toBeOnTheScreen();
  });

  it('sells for 60% of its spending plus the whole treasury', async () => {
    await openVending('0', { business: { treasuryCents: dollars('50') } });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Sell Vending Machine/ }));
    expect(screen.getByText('+$200.00')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByText("You don't own Vending Machine")).toBeOnTheScreen();
  });
});

describe('Business staff (BUS13)', () => {
  it('hires operations staff, named Restocking at a Vending Machine, after confirming', async () => {
    await openVending('0', { business: { treasuryCents: dollars('20') } });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hire Restocking, Hire · $16.80' }));
    expect(screen.getByRole('header', { name: 'Hire restocking staff' })).toBeOnTheScreen();
    expect(screen.getByText('$100.00/day → $106.00/day')).toBeOnTheScreen();
    await confirm();
    expect(await findLine('Wages', '-$5.60/day')).toBeOnTheScreen();
    expect(line('Treasury', '$3.20')).toBeOnTheScreen();
    expect(screen.getByText('Restocking 1/2')).toBeOnTheScreen();
  });

  it('lets staff go for free', async () => {
    await openVending('0', { business: { staff: { operations: 0, sales: 1, manager: 0 } } });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Let go of one Sales' }));
    expect(screen.getByText('Free')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByText('Sales 0/1')).toBeOnTheScreen();
  });

  it('keeps the manager locked until Local (BUS15)', async () => {
    await openVending('0');
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(screen.queryByText('Manager')).not.toBeOnTheScreen();
    expect(screen.getByText('Next: Local. Needs Units 1/3 · Days owned 0/3')).toBeOnTheScreen();
  });

  it('says the manager sets the price each day (BUS14)', async () => {
    await openVending('0', {
      business: { stage: 2, staff: { operations: 0, sales: 0, manager: 1 } },
    });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(
      screen.getByText('Your manager sets the best price at the start of each day'),
    ).toBeOnTheScreen();
    expect(line('Manager bonus', '$8.60/day')).toBeOnTheScreen();
  });
});

describe('Business stages (BUS15)', () => {
  it('shows what the next stage needs', async () => {
    await openVending('0', { business: { treasuryCents: dollars('600') }, day: 1 });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(screen.getByText('Next: Local. Needs Units 1/3 · Days owned 1/3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Grow to Local · $500.00' })).toBeDisabled();
  });

  it('grows to Local from the treasury after confirming', async () => {
    await openVending('0', { business: { units: 3, treasuryCents: dollars('600') }, day: 3 });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Grow to Local · $500.00' }));
    expect(screen.getByRole('header', { name: 'Grow to Local' })).toBeOnTheScreen();
    await confirm();
    expect(await findLine('Status', 'Open · Local')).toBeOnTheScreen();
    expect(screen.getByText('Units 3/8')).toBeOnTheScreen();
  });
});

describe('Businesses catalog', () => {
  it('opens details from an owned business and previews the next Tier', async () => {
    await openVending('100', { initialUrl: '/businesses' });
    await fireEvent.press(screen.getByRole('tab', { name: 'Tier 2' }));
    expect(screen.getByText('Unlocks at $5,000.00 peak net worth')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Owned' }));
    await fireEvent.press(screen.getByRole('button', { name: /Vending Machine.*Open →/g }));
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(await findLine('Profit', '$100.00/day')).toBeOnTheScreen();
  });
});
