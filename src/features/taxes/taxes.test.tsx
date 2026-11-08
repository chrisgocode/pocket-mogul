import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { taxReturnOwner } from '@/application/taxTesting';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

let session: TestGame;

beforeEach(async () => {
  session = await startTestGameFrom(taxReturnOwner());
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
});

describe('Taxes', () => {
  it('opens from Profile and explains full reporting before collecting the exact bill', async () => {
    await renderRouter('src/app', { initialUrl: '/portfolio' });
    await fireEvent.press(screen.getByRole('button', { name: 'Taxes' }));
    expect(screen).toHavePathname('/taxes');
    expect(screen.getByLabelText('Honest tax, $1,000.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Pay & file · $1,000.00 now' }));
    expect(screen.getByLabelText('Personal cash collected, $1,000.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'File and pay available cash' }));
    await fireEvent.press(screen.getByRole('button', { name: '▸ Payment history' }));
    expect(await screen.findByLabelText('Lifetime tax paid, $1,000.00')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('1000'));
  });

  it('discloses the audit probability, back tax and additional fine before filing zero', async () => {
    await renderRouter('src/app', { initialUrl: '/taxes' });
    await fireEvent.press(screen.getByRole('button', { name: 'Don’t report · $0 now' }));
    expect(
      screen.getByLabelText('One audit check, 40% after 10 credited minutes'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Back tax if audited, $1,000.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Additional fine, $2,000.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'File zero return' }));
    expect(await screen.findByText(/Return 1 · Audit pending/)).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('2000'));
  });

  it('shows an audit result and a free debt payment path', async () => {
    const state = taxReturnOwner('safe');
    session = await startTestGameFrom({ ...state, cashCents: dollars('500') });
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/taxes' });
    await act(async () => {
      await session.game.dispatch({
        id: 'zero',
        command: {
          type: 'FileTaxReturn',
          returnId: 1,
          method: 'zero',
          revision: session.game.getSnapshot().state.revision,
        },
      });
      session.clock.advance(600_000);
      await session.game.checkpoint();
    });
    expect(await screen.findByLabelText('Outstanding assessed debt, $2,500.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '▸ Tax rules' }));
    expect(screen.getByText(/No interest, repeated fines or forced sales/)).toBeOnTheScreen();
  });
});
