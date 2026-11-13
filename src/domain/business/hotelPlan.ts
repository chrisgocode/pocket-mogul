import type { OwnedBusiness } from './owned';

export function withTodaysRatePlanned(business: OwnedBusiness): OwnedBusiness {
  const { hotel } = business;
  if (hotel.status !== 'active') return business;
  const rates = { ...hotel.rates, [hotel.season]: business.priceLevel };
  return { ...business, hotel: { ...hotel, rates } };
}
