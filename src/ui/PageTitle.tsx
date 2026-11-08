import { AppText } from './Typography';
export function PageTitle({ title }: { title: string }) {
  return (
    <AppText variant="display" accessibilityRole="header">
      {title}
    </AppText>
  );
}
