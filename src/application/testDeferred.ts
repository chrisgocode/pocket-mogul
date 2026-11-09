const doNothing = (): void => undefined;

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = doNothing;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
