import { AppText } from './Typography';

export function OptionalCaption({ text }: { text: string | undefined }) {
  return text === undefined ? null : (
    <AppText variant="caption" muted>
      {text}
    </AppText>
  );
}
