import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import type { Category } from '@/data/types';

/**
 * Flat, warm bakery illustrations (one per category). Shown when a listing has no
 * photo, and on empty states. Drawn on a 120×120 canvas.
 */
export type BakeryArtProps = {
  category: Category;
  size?: number;
  /** The tile color behind the art (used for the cookie's bite mark) */
  background?: string;
};

const C = {
  shadow: 'rgba(126, 68, 22, 0.14)',
  cream: '#FFF6E6',
  crumb: '#FFFFFF',
  cherry: '#C9352A',
  cherryHi: '#F08A7A',
  stem: '#7E4416',
  honey: '#F2B33D',
  frosting: '#F6A796',
  dough: '#E2A04C',
  doughLight: '#F2C37A',
  doughDark: '#B86E26',
  cookie: '#D38E45',
  cookieBack: '#E3A85E',
  chip: '#5E321A',
  bread: '#C9803A',
  breadTop: '#D9934A',
  breadDark: '#A8622A',
  sesame: '#FFF3DF',
  wrapper: '#E05A3E',
  wrapperDark: '#AE3E27',
  sprinkleA: '#F2B33D',
  sprinkleB: '#4F8A5B',
  sprinkleC: '#7FB2E5',
};

function Sparkles() {
  return (
    <G opacity={0.55}>
      <Circle cx={18} cy={24} r={2.2} fill={C.crumb} />
      <Circle cx={101} cy={20} r={1.6} fill={C.crumb} />
      <Circle cx={106} cy={82} r={2} fill={C.crumb} />
      <Circle cx={13} cy={88} r={1.4} fill={C.crumb} />
    </G>
  );
}

function CakeSliceArt() {
  return (
    <>
      <Ellipse cx={60} cy={99} rx={40} ry={5} fill={C.shadow} />
      <Path d="M22 58 L98 44 L98 92 Q98 97 93 97 L27 97 Q22 97 22 92 Z" fill={C.cream} />
      <Path d="M22 72 L98 59 L98 66 L22 79 Z" fill={C.honey} />
      <Path d="M22 85 L98 72 L98 79 L22 92 Z" fill={C.honey} />
      <Path d="M20 57 L100 42 L100 50 L20 65 Z" fill={C.frosting} />
      <Circle cx={30} cy={65} r={3.2} fill={C.frosting} />
      <Circle cx={52} cy={61} r={4} fill={C.frosting} />
      <Circle cx={84} cy={55} r={3.4} fill={C.frosting} />
      <Path d="M72 33 Q76 22 87 18" stroke={C.stem} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Circle cx={70} cy={41} r={9.5} fill={C.cherry} />
      <Ellipse cx={66.5} cy={37.5} rx={2.8} ry={1.8} fill={C.cherryHi} />
    </>
  );
}

function CookiesArt({ background }: { background: string }) {
  return (
    <>
      <Ellipse cx={60} cy={99} rx={38} ry={5} fill={C.shadow} />
      <Circle cx={76} cy={52} r={24} fill={C.cookieBack} />
      <Circle cx={96} cy={40} r={9} fill={background} />
      <Circle cx={90} cy={47} r={6} fill={background} />
      <Circle cx={70} cy={44} r={3} fill={C.chip} />
      <Circle cx={83} cy={60} r={2.6} fill={C.chip} />
      <Circle cx={66} cy={60} r={2.2} fill={C.chip} />
      <Circle cx={50} cy={70} r={28} fill={C.cookie} />
      <Circle cx={50} cy={70} r={24} fill="none" stroke={C.doughLight} strokeWidth={1.5} opacity={0.5} />
      <Circle cx={40} cy={60} r={3.6} fill={C.chip} />
      <Circle cx={58} cy={64} r={3.2} fill={C.chip} />
      <Circle cx={46} cy={80} r={3.4} fill={C.chip} />
      <Circle cx={63} cy={80} r={2.6} fill={C.chip} />
      <Circle cx={33} cy={74} r={2.4} fill={C.chip} />
      <Circle cx={52} cy={52} r={2} fill={C.chip} />
      <Circle cx={95} cy={74} r={2} fill={C.cookieBack} />
      <Circle cx={101} cy={79} r={1.4} fill={C.cookieBack} />
    </>
  );
}

function CroissantArt() {
  const seg = {
    fill: C.dough,
    stroke: C.doughDark,
    strokeWidth: 2,
    strokeLinejoin: 'round' as const,
  };
  return (
    <>
      <Ellipse cx={60} cy={97} rx={40} ry={5} fill={C.shadow} />
      {/* tips curl down, the body arcs up: a crescent */}
      <Path d="M30 66 Q16 76 14 92 Q24 90 34 80 Z" {...seg} />
      <Path d="M90 66 Q104 76 106 92 Q96 90 86 80 Z" {...seg} />
      <Path d="M24 70 Q28 52 44 48 Q50 62 44 82 Q32 82 24 70 Z" {...seg} />
      <Path d="M96 70 Q92 52 76 48 Q70 62 76 82 Q88 82 96 70 Z" {...seg} />
      <Path d="M42 50 Q60 34 78 50 Q80 68 70 86 Q60 90 50 86 Q40 68 42 50 Z" {...seg} />
      <Path d="M50 52 Q60 44 70 52" stroke={C.doughLight} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M31 62 Q35 56 41 55" stroke={C.doughLight} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M89 62 Q85 56 79 55" stroke={C.doughLight} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function ChallahArt() {
  const bump = { fill: C.breadTop, stroke: C.breadDark, strokeWidth: 1.6 };
  return (
    <>
      <Ellipse cx={60} cy={95} rx={44} ry={5} fill={C.shadow} />
      <Ellipse cx={60} cy={76} rx={42} ry={17} fill={C.bread} />
      <Circle cx={30} cy={68} r={12} {...bump} />
      <Circle cx={90} cy={68} r={12} {...bump} />
      <Circle cx={48} cy={62} r={14} {...bump} />
      <Circle cx={72} cy={62} r={14} {...bump} />
      <Ellipse cx={44} cy={56} rx={5} ry={3} fill={C.doughLight} opacity={0.75} />
      <Ellipse cx={68} cy={56} rx={5} ry={3} fill={C.doughLight} opacity={0.75} />
      <Ellipse cx={27} cy={63} rx={3.5} ry={2.2} fill={C.doughLight} opacity={0.7} />
      <Ellipse cx={87} cy={63} rx={3.5} ry={2.2} fill={C.doughLight} opacity={0.7} />
      {[
        [52, 66, 20],
        [58, 58, -30],
        [76, 66, 40],
        [80, 58, -10],
        [36, 70, 10],
        [42, 64, -40],
        [94, 70, 30],
        [64, 70, -20],
        [26, 72, 50],
      ].map(([x, y, r]) => (
        <Ellipse key={`${x}-${y}`} cx={x} cy={y} rx={1.8} ry={1} transform={`rotate(${r} ${x} ${y})`} fill={C.sesame} />
      ))}
    </>
  );
}

function CupcakeArt() {
  return (
    <>
      <Ellipse cx={60} cy={100} rx={30} ry={4.5} fill={C.shadow} />
      <Path d="M35 68 L85 68 L79 98 L41 98 Z" fill={C.wrapper} />
      {[45, 53, 60, 67, 75].map((x, i) => (
        <Line key={x} x1={x} y1={70} x2={x - (i - 2) * 1.6} y2={96} stroke={C.wrapperDark} strokeWidth={2} />
      ))}
      <Ellipse cx={60} cy={66} rx={29} ry={9} fill={C.cream} />
      <Ellipse cx={60} cy={55} rx={23} ry={9} fill={C.cream} />
      <Ellipse cx={60} cy={45} rx={15} ry={8} fill={C.cream} />
      <Path d="M52 40 Q60 30 68 40 Z" fill={C.cream} />
      <Rect x={44} y={58} width={6} height={2.4} rx={1.2} transform="rotate(-25 47 59)" fill={C.sprinkleA} />
      <Rect x={68} y={60} width={6} height={2.4} rx={1.2} transform="rotate(30 71 61)" fill={C.sprinkleB} />
      <Rect x={56} y={64} width={6} height={2.4} rx={1.2} transform="rotate(10 59 65)" fill={C.sprinkleC} />
      <Rect x={62} y={48} width={6} height={2.4} rx={1.2} transform="rotate(-40 65 49)" fill={C.sprinkleA} />
      <Rect x={50} y={47} width={6} height={2.4} rx={1.2} transform="rotate(35 53 48)" fill={C.wrapper} />
      <Path d="M62 27 Q65 19 73 16" stroke={C.stem} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Circle cx={60} cy={32} r={8} fill={C.cherry} />
      <Ellipse cx={57} cy={29} rx={2.4} ry={1.5} fill={C.cherryHi} />
    </>
  );
}

export function BakeryArt({ category, size = 96, background = '#FFF8EE' }: BakeryArtProps) {
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Sparkles />
        {category === 'cakes' ? (
          <CakeSliceArt />
        ) : category === 'cookies' ? (
          <CookiesArt background={background} />
        ) : category === 'pastries' ? (
          <CroissantArt />
        ) : category === 'breads' ? (
          <ChallahArt />
        ) : (
          <CupcakeArt />
        )}
      </Svg>
    </View>
  );
}
