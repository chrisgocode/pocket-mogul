import type { AssetQuote } from '@/application/marketsView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { AssetQuoteRow } from './AssetQuoteRow';

export function QuoteSection({
  title,
  note,
  quotes,
}: {
  title: string;
  note?: string;
  quotes: readonly AssetQuote[];
}) {
  return (
    <Section title={title} {...(note === undefined ? {} : { note })}>
      <Card>
        {quotes.map((quote) => (
          <AssetQuoteRow key={quote.asset.id} quote={quote} />
        ))}
      </Card>
    </Section>
  );
}
