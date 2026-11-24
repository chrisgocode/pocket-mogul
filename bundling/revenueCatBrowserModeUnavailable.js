function unavailable() {
  throw new Error(
    'RevenueCat browser mode is not bundled: Pocket Fortune runs only as a development or store build',
  );
}

export const PurchasesCommon = {
  configure: unavailable,
  getInstance: unavailable,
  isConfigured: unavailable,
  setLogHandler: unavailable,
  setLogLevel: unavailable,
  setProxyUrl: unavailable,
};
