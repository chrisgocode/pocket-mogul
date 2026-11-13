import { fireEvent, render, screen } from '@testing-library/react-native';

import { collectibleArtwork } from '@/content/collectibleArtwork';

import { Artwork } from './Artwork';

const sources = collectibleArtwork('marlow_roadster');

describe('collectible images', () => {
  it('keeps a local category fallback while loading and removes it on display', async () => {
    await render(<Artwork sources={sources} label="Cars" />);
    expect(screen.getByText('Cars', { includeHiddenElements: true })).toBeOnTheScreen();
    const image = screen.getByTestId('collectible-artwork', { includeHiddenElements: true });
    expect(image.props).toEqual(
      expect.objectContaining({ cachePolicy: 'memory-disk', contentFit: 'contain' }),
    );
    await fireEvent(image, 'display');
    expect(screen.queryByText('Cars', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('falls back when offline and resets for another piece', async () => {
    const view = await render(<Artwork sources={sources} label="Cars" />);
    await fireEvent(
      screen.getByTestId('collectible-artwork', { includeHiddenElements: true }),
      'error',
      { nativeEvent: { error: 'offline' } },
    );
    expect(screen.getByText('Cars', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectible-artwork', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    await view.rerender(<Artwork sources={collectibleArtwork('pallas_mini_850')} label="Cars" />);
    expect(
      screen.getByTestId('collectible-artwork', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('needs no network image when artwork has not been published', async () => {
    await render(<Artwork sources={undefined} label="Yachts" />);
    expect(screen.getByText('Yachts', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectible-artwork', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });
});
