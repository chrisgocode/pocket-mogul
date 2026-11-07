import { AppText } from './Typography';
import { trendColors, type Trend } from './tokens';

export function OptionalCaption({
  text,
  trend,
}: {
  text: string | undefined;
  trend?: Trend | undefined;
}) {
  const trendStyle = trend === undefined ? undefined : { color: trendColors[trend] };
  return text === undefined ? null : (
    <AppText variant="caption" muted style={trendStyle}>
      {text}
    </AppText>
  );
}
