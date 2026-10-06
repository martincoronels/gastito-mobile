import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ALL_FILTER } from '@/domain/catalog';
import { safeColor } from '@/domain/sanitize';
import type { Category } from '@/domain/types';
import { makeStyles, PAD, radius } from '@/theme';

interface CategoryFilterProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

/** La tira de filtros. Se centra sola en el elegido para no perderlo de vista. */
export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const styles = useStyles();
  const scroll = useRef<ScrollView>(null);
  const chips = useRef(new Map<string, { x: number; width: number }>());
  const viewport = useRef(0);
  const contentWidth = useRef(0);

  const centerSelected = useCallback(() => {
    const chip = chips.current.get(selected);
    if (!chip || !viewport.current) return;
    const max = Math.max(0, contentWidth.current - viewport.current);
    const x = Math.min(max, Math.max(0, chip.x + chip.width / 2 - viewport.current / 2));
    scroll.current?.scrollTo({ x, animated: false });
  }, [selected]);

  useEffect(centerSelected, [centerSelected]);

  const items = [
    { id: ALL_FILTER, name: 'Todas', color: null as string | null },
    ...categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
  ];

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
      contentContainerStyle={styles.content}
      onLayout={(e) => {
        viewport.current = e.nativeEvent.layout.width;
      }}
      onContentSizeChange={(w) => {
        contentWidth.current = w;
        centerSelected();
      }}
    >
      {items.map((item) => {
        const on = item.id === selected;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            onLayout={(e) =>
              chips.current.set(item.id, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })
            }
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            {item.color ? <View style={[styles.dot, { backgroundColor: safeColor(item.color) }]} /> : null}
            <AppText style={[styles.label, on && styles.labelOn]}>{item.name}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { marginHorizontal: -PAD, flexGrow: 0 },
  content: { gap: 7, paddingHorizontal: PAD, paddingBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
  },
  chipOn: { backgroundColor: c.accent },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13.5, lineHeight: 19.6, color: c.ink2 },
  labelOn: { color: c.onAccent },
}));
