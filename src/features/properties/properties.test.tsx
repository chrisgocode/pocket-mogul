import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState, type OwnedProperty } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const VACANT_STUDIO: OwnedProperty = {
  definitionId: 'studio',
  levels: { renovation: 0, furnishings: 0, systems: 0, expansion: 0 },
  rented: false,
  upgradeSpendCents: dollars('0'),
};

async function open(
  cash: string,
  { properties = [] as OwnedProperty[], initialUrl = '/properties' } = {},
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
    properties,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const openStudio = (cash: string, studio: Partial<OwnedProperty> = {}) =>
  open(cash, { properties: [{ ...VACANT_STUDIO, ...studio }], initialUrl: '/properties/studio' });

const sheet = () => screen.getByRole('header', { name: /^(Buy|Rent out|Unrent|Upgrade|Sell) / });
const confirm = () => fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));

describe('Properties listings', () => {
  it('lists all 8 properties and buys one when affordable (RE01)', async () => {
    await open('25,000');
    expect(screen.getAllByRole('button', { name: /^Buy / })).toHaveLength(8);
    expect(screen.getByRole('button', { name: /^Buy Starter House/ })).toBeDisabled();
    expect(screen.getByText('Need $55,000.00 more')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Buy City Studio/ }));
    expect(sheet()).toHaveTextContent('Buy City Studio');
    expect(screen.getByText('-$20,000.00')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByLabelText('Cash $5,000.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Manage City Studio' }));
    expect(await screen.findByLabelText('Status, Vacant')).toBeOnTheScreen();
  });
});

describe('Property details', () => {
  it('rents out a vacant property and shows its net rent (RE02)', async () => {
    await openStudio('0');
    expect(screen.getByLabelText('Net rent, $0.00/min')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Rent out City Studio' }));
    expect(sheet()).toHaveTextContent('Rent out City Studio');
    expect(screen.getByText('+$100.00/min net')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByLabelText('Status, Rented')).toBeOnTheScreen();
    expect(screen.getByLabelText('Net rent, $100.00/min')).toBeOnTheScreen();
  });

  it('unrents a rented property, stopping rent and upkeep (RE05)', async () => {
    await openStudio('0', { rented: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Unrent City Studio' }));
    expect(screen.getByText('-$100.00/min net')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByLabelText('Status, Vacant')).toBeOnTheScreen();
  });

  it('previews and buys the first Renovation for $2,000 (AC12)', async () => {
    await openStudio('2,000', { rented: true });
    await fireEvent.press(screen.getByRole('button', { name: /^Upgrade Renovation/ }));
    expect(sheet()).toHaveTextContent('Upgrade Renovation');
    expect(screen.getByText('-$2,000.00')).toBeOnTheScreen();
    expect(screen.getByText('$120.00/min → $132.00/min')).toBeOnTheScreen();
    expect(screen.getByText('$20.00/min → $20.00/min')).toBeOnTheScreen();
    expect(screen.getByText('$100.00/min → $112.00/min')).toBeOnTheScreen();
    expect(screen.getByText('$20,000.00 → $21,600.00')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByLabelText('Estimated value, $21,600.00')).toBeOnTheScreen();
    expect(screen.getByText('Renovation 1/10')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^Sell City Studio, Sell · \+\$20,520\.00/ }),
    ).toBeOnTheScreen();
  });

  it('shows Expansion as unavailable on City Studio', async () => {
    await openStudio('1,000,000');
    expect(screen.getByLabelText(/^Expansion, Not available on this property/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Upgrade Expansion/ })).not.toBeOnTheScreen();
  });

  it('sells for 95% of estimated value and returns the listing (RE06)', async () => {
    await openStudio('0');
    await fireEvent.press(screen.getByRole('button', { name: /^Sell City Studio/ }));
    expect(screen.getByText('+$19,000.00')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByText("You don't own City Studio")).toBeOnTheScreen();
  });
});
