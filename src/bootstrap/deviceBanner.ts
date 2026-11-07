import { lazy } from 'react';

export const DeviceBanner = lazy(async () => {
  const { GoogleBanner } = await import('@/infrastructure/googleBanner');
  return { default: GoogleBanner };
});
