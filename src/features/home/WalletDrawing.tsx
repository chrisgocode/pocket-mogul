import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, sectionColors } from '@/ui/tokens';
import type { WalletArtwork } from './walletArtwork';
export function WalletDrawing({ artwork }: { artwork: WalletArtwork }) {
  return (
    <Svg width={180} height={112} viewBox="0 0 180 112" accessibilityElementsHidden>
      <Path
        d="M28 26 L131 12 Q140 11 140 21 V87 L28 95 Z"
        fill={artwork.color}
        stroke={colors.textMuted}
      />
      <Rect
        x={20}
        y={31}
        width={140}
        height={71}
        rx={12}
        fill={colors.surfaceMuted}
        stroke={sectionColors.earn}
        strokeWidth={2}
      />
      <Rect
        x={126}
        y={51}
        width={42}
        height={31}
        rx={7}
        fill={colors.surface}
        stroke={sectionColors.earn}
        strokeWidth={2}
      />
      <Circle cx={140} cy={66} r={4} fill={sectionColors.earn} />
      <Path d="M37 48 H76 M37 57 H61" stroke={colors.textMuted} strokeWidth={2} />
    </Svg>
  );
}
