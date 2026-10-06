import Svg, { G, Path } from 'react-native-svg';

/** Los cuatro arcos de la marca (viewBox 32×32), los mismos del favicon de la web. */
export const LOGO_ARCS = [
  { d: 'M16 3a13 13 0 0 1 11.3 6.5', color: '#E0452F' },
  { d: 'M29 16a13 13 0 0 1-6.5 11.3', color: '#2D5FD1' },
  { d: 'M16 29A13 13 0 0 1 4.7 22.5', color: '#D2851B' },
  { d: 'M3 16A13 13 0 0 1 9.5 4.7', color: '#1F7A4C' },
] as const;

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G fill="none" strokeWidth={6} strokeLinecap="round">
        {LOGO_ARCS.map((arc) => (
          <Path key={arc.d} d={arc.d} stroke={arc.color} />
        ))}
      </G>
    </Svg>
  );
}
