import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { AppText } from '@/components/ui/AppText';
import { useGridColumns } from '@/components/ui/grid';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/domain/types';
import { colors } from '@/theme';

interface CategoryPickerProps {
  categories: readonly Category[];
  selected: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

/** La grilla de categorías del formulario, más el botón "Nueva". */
export function CategoryPicker({ categories, selected, onSelect, onCreate }: CategoryPickerProps) {
  const { itemWidth } = useGridColumns(88, 7);
  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const on = category.id === selected;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={category.name}
            accessibilityHint={category.hint}
            style={[styles.item, { width: itemWidth }, on && styles.itemOn]}
          >
            <CategoryChip category={category} size={30} />
            <AppText style={[styles.name, on && styles.nameOn]}>{category.name}</AppText>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel="Crear una categoría tuya"
        style={[styles.item, styles.add, { width: itemWidth }]}
      >
        <View style={styles.addChip}>
          <Icon name="plus" size={15} color={colors.ink2} />
        </View>
        <AppText style={styles.name}>Nueva</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  item: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 11,
    paddingHorizontal: 4,
    paddingBottom: 9,
    borderRadius: 14,
    backgroundColor: colors.soft,
  },
  itemOn: { backgroundColor: colors.ink },
  name: { fontSize: 11.5, lineHeight: 13.8, textAlign: 'center', color: colors.ink2 },
  nameOn: { color: colors.white },
  add: { backgroundColor: 'transparent', boxShadow: `inset 0 0 0 1.5px ${colors.line}` },
  addChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.chipAdd,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
