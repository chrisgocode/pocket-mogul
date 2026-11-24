import path from 'node:path';

export type ModuleRequest = {
  readonly moduleName: string;
  readonly platform: string | null;
  readonly originModulePath: string;
};

const REVENUECAT_BROWSER_MODE = '@revenuecat/purchases-js-hybrid-mappings';
const ZOD_LOCALE_INDEX = '../locales/index.js';
const ZOD_FOLDER = `${path.sep}node_modules${path.sep}zod${path.sep}`;

const redirects: readonly {
  readonly applies: (request: ModuleRequest) => boolean;
  readonly filePath: string;
}[] = [
  {
    applies: ({ moduleName, platform }) =>
      platform !== 'web' && moduleName === REVENUECAT_BROWSER_MODE,
    filePath: path.join(import.meta.dirname, 'revenueCatBrowserModeUnavailable.js'),
  },
  {
    applies: ({ moduleName, originModulePath }) =>
      moduleName === ZOD_LOCALE_INDEX && originModulePath.includes(ZOD_FOLDER),
    filePath: path.join(import.meta.dirname, 'zodEnglishLocale.js'),
  },
];

export function redirectedModule(request: ModuleRequest): string | undefined {
  return redirects.find((redirect) => redirect.applies(request))?.filePath;
}
