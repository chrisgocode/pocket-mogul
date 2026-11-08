import { Link } from 'expo-router';

import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

export function ProfileLinks() {
  return (
    <Card>
      <Link href="/taxes" asChild>
        <Button label="Taxes" onPress={() => undefined} />
      </Link>
      <Link href="/goals" asChild>
        <Button label="Goals & achievements" variant="secondary" onPress={() => undefined} />
      </Link>
      <Link href="/settings" asChild>
        <Button label="Settings" variant="secondary" onPress={() => undefined} />
      </Link>
    </Card>
  );
}
