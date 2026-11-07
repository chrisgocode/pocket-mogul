import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { trendColors, type Trend } from './tokens';

export type LinePoint = { readonly x: number; readonly y: number };
export type LineTrend = Trend;

const VIEW_SIZE = 100;
const VIEW_PADDING = 4;
const VIEW_HEIGHT = VIEW_SIZE + VIEW_PADDING + VIEW_PADDING;
const CHART_HEIGHT = 160;
const STROKE_WIDTH = 2;

function drawable(points: readonly LinePoint[]): readonly LinePoint[] {
  const [only] = points;
  return points.length === 1 && only !== undefined
    ? [
        { ...only, x: 0 },
        { ...only, x: 1 },
      ]
    : points;
}

export function LineChart({
  points,
  trend,
  summary,
}: {
  points: readonly LinePoint[];
  trend: LineTrend;
  summary: string;
}) {
  const coordinates = drawable(points)
    .map((point) => `${point.x * VIEW_SIZE},${(1 - point.y) * VIEW_SIZE}`)
    .join(' ');
  return (
    <Svg
      width="100%"
      height={CHART_HEIGHT}
      viewBox={`0 ${-VIEW_PADDING} ${VIEW_SIZE} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      style={styles.chart}
    >
      <Polyline
        points={coordinates}
        fill="none"
        stroke={trendColors[trend]}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  chart: { alignSelf: 'stretch' },
});
