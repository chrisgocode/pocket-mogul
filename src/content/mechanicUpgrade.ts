export function withMechanics<Business extends { readonly id: string }, Mechanic>(
  businesses: readonly Business[],
  mechanics: Readonly<Partial<Record<string, Mechanic>>>,
): (Business | (Business & { readonly mechanic: Mechanic }))[] {
  return businesses.map((business) => {
    const mechanic = mechanics[business.id];
    return mechanic === undefined ? business : Object.assign({}, business, { mechanic });
  });
}
