import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';
import { ICON_PATHS, type IconName } from './icons';

interface IconProps {
  name: IconName;
  size?: number;
  /** Por defecto, el gris secundario del tema */
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color, strokeWidth = 1.9 }: IconProps) {
  const { colors } = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? colors.ink2}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {ICON_PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
