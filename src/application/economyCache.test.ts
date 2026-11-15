import { getContent, businessDefinition } from '@/content';

import { businessEconomy } from './economy';

const content = getContent();

describe('business economy derivation', () => {
  it('reuses the immutable catalogue for the same content', () => {
    const economy = businessEconomy(content);
    expect(businessEconomy(content)).toBe(economy);
    expect(economy.catalog).toEqual(content.businesses.map((b) => businessDefinition(b, content)));
  });

  it('keeps replacement content separate even at the same economy version', () => {
    const changed = { ...content, businesses: content.businesses.slice(1) };
    const economy = businessEconomy(changed);
    expect(economy).not.toBe(businessEconomy(content));
    expect(economy.catalog).toEqual(changed.businesses.map((b) => businessDefinition(b, changed)));
    expect(businessEconomy(content).catalog).toHaveLength(content.businesses.length);
  });
});
