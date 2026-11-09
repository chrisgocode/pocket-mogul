import Svg, { Path, Rect } from 'react-native-svg';
import { sectionColors, colors } from './tokens';
const BUILDINGS = [
  'M40 132 V34 L147 20 L235 57 V132 Z M147 20 V132 M61 53 V63 M85 49 V59 M109 45 V55 M61 77 V87 M85 73 V83 M109 69 V79 M61 101 V111 M85 97 V107 M109 93 V103 M173 65 V75 M197 76 V86 M173 91 V101 M197 102 V112',
  'M38 131 V72 L145 24 L248 72 V131 Z M29 75 L145 17 L257 75 M69 83 H103 V106 H69 Z M180 83 H214 V106 H180 Z M127 93 H156 V131',
  'M34 131 V71 L89 30 L145 71 L201 30 L257 71 V131 Z M26 72 L89 23 L145 65 L201 23 L265 72 M56 81 H90 V102 H56 Z M172 81 H206 V102 H172 Z M105 104 H126 V131 M221 104 H242 V131',
  'M43 132 V23 H218 V132 M218 23 L253 43 V132 M62 41 H199 M62 62 H199 M62 83 H199 M62 104 H199 M83 38 V115 M112 38 V115 M141 38 V115 M170 38 V115',
];
export function PropertyArt({ index }: { index: number }) {
  return (
    <Svg width={112} height={86} viewBox="0 0 300 155" accessibilityElementsHidden>
      <Rect width={300} height={155} rx={12} fill={colors.surfaceMuted} />
      <Path d="M0 133 H300 V155 H0 Z" fill={colors.border} />
      <Path
        d={BUILDINGS[index % BUILDINGS.length] ?? ''}
        fill={colors.surface}
        stroke={sectionColors.properties}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
