import { dollars } from './money';
import {
  estimatedValueCents,
  levelZeroProperty,
  propertySaleProceedsCents,
  quotePropertyIncome,
  quotePropertyUpgrade,
  type PropertyDefinition,
} from './propertyQuotes';
import { propertyRules } from './testRules';

const rules = propertyRules;

const studio: PropertyDefinition = {
  id: 'studio',
  price: dollars('20,000'),
  rentPerMinute: dollars('120'),
  upkeepPerMinute: dollars('20'),
  expansionAllowed: false,
};

const duplex: PropertyDefinition = {
  id: 'duplex',
  price: dollars('250,000'),
  rentPerMinute: dollars('1,300'),
  upkeepPerMinute: dollars('200'),
  expansionAllowed: true,
};

const rented = (definitionId: string) => ({ ...levelZeroProperty(definitionId), rented: true });

describe('property income quote', () => {
  it('nets a rented base City Studio $100 per minute', () => {
    expect(quotePropertyIncome(rented('studio'), { definition: studio, rules })).toEqual({
      rentCents: dollars('120'),
      upkeepCents: dollars('20'),
      netPerMinuteCents: dollars('100'),
    });
  });

  it('earns nothing and pays no upkeep while vacant', () => {
    expect(
      quotePropertyIncome(levelZeroProperty('studio'), { definition: studio, rules }),
    ).toMatchObject({ netPerMinuteCents: dollars('0') });
  });

  it('floors rent and upkeep across every track', () => {
    const levels = { renovation: 3, furnishings: 1, systems: 7, expansion: 2 };
    expect(
      quotePropertyIncome({ ...rented('duplex'), levels }, { definition: duplex, rules }),
    ).toEqual({
      rentCents: dollars('2,632.50'),
      upkeepCents: dollars('216'),
      netPerMinuteCents: dollars('2,416.50'),
    });
  });
});

describe('property upgrade quote', () => {
  it('prices the first City Studio Renovation at $2,000 with rent $132 and value $21,600 (AC12)', () => {
    expect(
      quotePropertyUpgrade(rented('studio'), { definition: studio, rules, track: 'renovation' }),
    ).toEqual({
      status: 'available',
      track: 'renovation',
      level: 0,
      priceCents: dollars('2,000'),
      rentCents: dollars('120'),
      nextRentCents: dollars('132'),
      upkeepCents: dollars('20'),
      nextUpkeepCents: dollars('20'),
      netPerMinuteCents: dollars('100'),
      nextNetPerMinuteCents: dollars('112'),
      rentedBenefitPerMinuteCents: dollars('12'),
      valueCents: dollars('20,000'),
      nextValueCents: dollars('21,600'),
    });
  });

  it('grows each level by 25% and rounds the price up to the cent', () => {
    const levels = { renovation: 0, furnishings: 3, systems: 0, expansion: 0 };
    expect(
      quotePropertyUpgrade(
        { ...levelZeroProperty('studio'), levels },
        { definition: studio, rules, track: 'furnishings' },
      ),
    ).toMatchObject({ priceCents: dollars('3,125') });
    expect(
      quotePropertyUpgrade(
        { ...levelZeroProperty('duplex'), levels: { ...levels, systems: 5 } },
        { definition: duplex, rules, track: 'systems' },
      ),
    ).toMatchObject({ priceCents: dollars('45,776.37') });
  });

  it('stops each track at its max level', () => {
    const levels = { renovation: 10, furnishings: 0, systems: 0, expansion: 4 };
    const maxed = { ...levelZeroProperty('duplex'), levels };
    expect(quotePropertyUpgrade(maxed, { definition: duplex, rules, track: 'renovation' })).toEqual(
      { status: 'max', track: 'renovation', level: 10 },
    );
    expect(quotePropertyUpgrade(maxed, { definition: duplex, rules, track: 'expansion' })).toEqual({
      status: 'max',
      track: 'expansion',
      level: 4,
    });
  });

  it('offers no Expansion where the listing does not allow it', () => {
    expect(
      quotePropertyUpgrade(rented('studio'), { definition: studio, rules, track: 'expansion' }),
    ).toEqual({ status: 'unavailable', track: 'expansion', level: 0 });
  });
});

describe('property value and sale', () => {
  it('sells a renovated City Studio for $20,520 against $22,000 invested (AC12)', () => {
    const renovated = {
      ...rented('studio'),
      levels: { renovation: 1, furnishings: 0, systems: 0, expansion: 0 },
      upgradeSpendCents: dollars('2,000'),
    };
    expect(estimatedValueCents(renovated, { definition: studio, rules })).toBe(dollars('21,600'));
    expect(propertySaleProceedsCents(renovated, { definition: studio, rules })).toBe(
      dollars('20,520'),
    );
  });
});
