import { getDefaultConfig, type MetroConfig } from 'expo/metro-config';

import { redirectedModule } from './bundling/nativeBundleRedirects.mts';

type Resolver = NonNullable<MetroConfig['resolver']['resolveRequest']>;

const defaults = getDefaultConfig(import.meta.dirname);
const resolveNormally = defaults.resolver.resolveRequest;

const resolveRequest: Resolver = (context, moduleName, platform) => {
  const filePath = redirectedModule({
    moduleName,
    platform,
    originModulePath: context.originModulePath,
  });
  if (filePath !== undefined) return { type: 'sourceFile', filePath };
  return (resolveNormally ?? context.resolveRequest)(context, moduleName, platform);
};

const config: MetroConfig = { ...defaults, resolver: { ...defaults.resolver, resolveRequest } };

export default config;
