export function withMechanic<Business extends { readonly id: string }, Mechanic>(
  businesses: readonly Business[],
  added: { readonly id: string; readonly mechanic: Mechanic },
): (Business | (Business & { readonly mechanic: Mechanic }))[] {
  const upgraded = (business: Business) =>
    business.id === added.id ? Object.assign({}, business, { mechanic: added.mechanic }) : business;
  return businesses.map(upgraded);
}
