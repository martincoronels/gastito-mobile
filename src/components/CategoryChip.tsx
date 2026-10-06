import { StyleSheet, View } from 'react-native';

import { safeColor } from '@/domain/sanitize';
import type { Category } from '@/domain/types';
import { useTheme } from '@/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

interface CategoryChipProps {
  category: Category;
  size?: number;
  iconSize?: number;
}

/** El círculo de color con el ícono (o el emoji, si es una categoría propia). */
export function CategoryChip({ category, size = 36, iconSize }: CategoryChipProps) {
  const { colors } = useTheme();
  const glyph = iconSize ?? (size >= 36 ? 18 : size >= 30 ? 15 : 14);
  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: safeColor(category.color) },
      ]}
    >
      {category.emoji ? (
        <AppText allowFontScaling={false} style={{ fontSize: Math.round(glyph * 0.95) }}>
          {category.emoji}
        </AppText>
      ) : (
        <Icon name={category.icon ?? 'dots'} size={glyph} color={colors.white} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', justifyContent: 'center' },
});
