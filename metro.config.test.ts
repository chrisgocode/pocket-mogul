import path from 'node:path';

import { redirectedModule } from './bundling/nativeBundleRedirects.mts';
import config from './metro.config.mts';

const APP_FILE = path.join(__dirname, 'src', 'app', 'index.tsx');
const ZOD_CORE = path.join(__dirname, 'node_modules', 'zod', 'v4', 'core', 'index.js');
const PURCHASES = path.join(
  __dirname,
  'node_modules',
  'react-native-purchases',
  'dist',
  'browser',
  'nativeModule.js',
);

describe('native bundle redirects', () => {
  it('leaves RevenueCat browser mode out of iOS and Android bundles', () => {
    for (const platform of ['ios', 'android']) {
      expect(
        redirectedModule({
          moduleName: '@revenuecat/purchases-js-hybrid-mappings',
          platform,
          originModulePath: PURCHASES,
        }),
      ).toBe(path.join(__dirname, 'bundling', 'revenueCatBrowserModeUnavailable.js'));
    }
  });

  it('keeps RevenueCat browser mode on web, where the SDK needs it', () => {
    expect(
      redirectedModule({
        moduleName: '@revenuecat/purchases-js-hybrid-mappings',
        platform: 'web',
        originModulePath: PURCHASES,
      }),
    ).toBeUndefined();
  });

  it('bundles only the English zod locale', () => {
    expect(
      redirectedModule({
        moduleName: '../locales/index.js',
        platform: 'ios',
        originModulePath: ZOD_CORE,
      }),
    ).toBe(path.join(__dirname, 'bundling', 'zodEnglishLocale.js'));
  });

  it('resolves the same relative path normally outside zod', () => {
    expect(
      redirectedModule({
        moduleName: '../locales/index.js',
        platform: 'ios',
        originModulePath: APP_FILE,
      }),
    ).toBeUndefined();
  });

  it('hands every other module to the default resolver', () => {
    const resolved = { type: 'empty' } as const;
    const context = {
      originModulePath: APP_FILE,
      resolveRequest: () => resolved,
    } as unknown as Parameters<NonNullable<typeof config.resolver.resolveRequest>>[0];
    expect(config.resolver.resolveRequest?.(context, 'react-native', 'ios')).toBe(resolved);
  });
});

describe('bundled stand-ins', () => {
  it('serves the real English zod messages', async () => {
    const { en } = await import('./bundling/zodEnglishLocale.js');
    const real = await import('zod/v4/locales/en.js');
    expect(en).toBe(real.default);
  });

  it('fails loudly if RevenueCat browser mode is ever reached', async () => {
    const { PurchasesCommon } = await import('./bundling/revenueCatBrowserModeUnavailable.js');
    for (const call of Object.values(PurchasesCommon))
      expect(call).toThrow('RevenueCat browser mode is not bundled');
  });
});
