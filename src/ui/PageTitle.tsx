import { AppText } from './Typography';

export function PageTitle({ title }: { title: string }) {
  return (
    <AppText variant="title" accessibilityRole="header">
      {title}
    </AppText>
  );
}
