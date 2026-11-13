import type { ProductView } from '@/application/factoryView';
import type { Product } from '@/domain/business/factoryRules';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';

import { PRODUCT_NAMES } from './factoryFormat';

const productChoice = (option: ProductView) => ({
  value: option.product,
  label: PRODUCT_NAMES[option.product],
});

const productFacts = (option: ProductView) =>
  `Price ${option.pricePercent}% · Buyers ${option.buyersPercent}% · ${formatMoneyExact(option.profitCents)}/day`;

function retoolNote(retoolDaysLeft: number): string {
  if (retoolDaysLeft === 0)
    return 'Switching retools the lines: half output until the day after next';
  return 'Retooling: lines at half output until the day after next';
}

export function ProductLineCard({
  product,
  retoolDaysLeft,
  products,
  onSelect,
}: {
  product: Product;
  retoolDaysLeft: number;
  products: readonly ProductView[];
  onSelect: (product: Product) => void;
}) {
  return (
    <Card>
      <ChoiceRow
        title="Product"
        note={retoolNote(retoolDaysLeft)}
        choices={products.map(productChoice)}
        selected={product}
        onSelect={(chosen) => (chosen === product ? undefined : onSelect(chosen))}
      />
      {products.map((option) => (
        <DetailLine
          key={option.product}
          label={PRODUCT_NAMES[option.product]}
          value={productFacts(option)}
        />
      ))}
    </Card>
  );
}
