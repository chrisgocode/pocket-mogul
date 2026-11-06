import type { Content } from '@/content';
import type { BusinessEconomy } from '@/domain/businesses';

export function businessEconomy(content: Content): BusinessEconomy {
  return { catalog: content.businesses, rules: content.economy.businessRules };
}
