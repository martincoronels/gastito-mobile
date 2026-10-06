import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FieldLabel } from '@/components/ui/FieldLabel';
import { IconButton } from '@/components/ui/IconButton';
import { TextField } from '@/components/ui/TextField';
import { useRevealInSheet } from '@/components/sheet/BottomSheet';
import { CUSTOM_COLORS, CUSTOM_EMOJIS, DEFAULT_EMOJI, MAX_CATEGORY_NAME_LENGTH } from '@/domain/catalog';
import type { Category } from '@/domain/types';
import { firstGrapheme } from '@/lib/text';
import { useAppActions } from '@/state/useAppActions';
import { colors, fonts } from '@/theme';

interface NewCategoryFormProps {
  onCancel: () => void;
  onCreated: (category: Category) => void;
}

/** "Tu propia categoría": emoji, nombre y color. */
export function NewCategoryForm({ onCancel, onCreated }: NewCategoryFormProps) {
  const actions = useAppActions();
  const reveal = useRevealInSheet();
  const [emoji, setEmoji] = useState<string>(DEFAULT_EMOJI);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CUSTOM_COLORS[0]);
  const box = useRef<View>(null);
  const nameInput = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => nameInput.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  const create = () => {
    const category = actions.createCategory({ name, emoji, color });
    if (category) onCreated(category);
    else nameInput.current?.focus();
  };

  const picked = firstGrapheme(emoji);

  return (
    <View ref={box} style={styles.box} onLayout={() => reveal(box.current, { immediate: true })}>
      <View style={styles.head}>
        <AppText style={styles.title}>Tu propia categoría</AppText>
        <IconButton
          icon="close"
          size={30}
          iconSize={17}
          onPress={onCancel}
          accessibilityLabel="Cancelar"
          pressedColor={colors.softPressed}
        />
      </View>
      <View style={styles.row}>
        <TextField
          value={emoji}
          onChangeText={setEmoji}
          maxLength={8}
          accessibilityLabel="Emoji"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={create}
          style={styles.emojiInput}
        />
        <TextField
          ref={nameInput}
          value={name}
          onChangeText={setName}
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          placeholder="Nombre. Ej: Mascotas"
          returnKeyType="done"
          onSubmitEditing={create}
          onFocus={() => reveal(nameInput.current)}
          style={styles.nameInput}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.emojis}
        contentContainerStyle={styles.emojisContent}
      >
        {CUSTOM_EMOJIS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setEmoji(option)}
            accessibilityRole="button"
            accessibilityLabel={`Emoji ${option}`}
            accessibilityState={{ selected: picked === option }}
            style={[styles.emoji, picked === option && styles.emojiOn]}
          >
            <AppText allowFontScaling={false} style={styles.emojiText}>
              {option}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
      <FieldLabel style={styles.colorLabel}>Color</FieldLabel>
      <View style={styles.colors}>
        {CUSTOM_COLORS.map((option, i) => (
          <Pressable
            key={option}
            onPress={() => setColor(option)}
            accessibilityRole="button"
            accessibilityLabel={`Color ${i + 1}`}
            accessibilityState={{ selected: color === option }}
            style={[styles.color, { backgroundColor: option }]}
          >
            {color === option ? <View style={styles.ring} /> : null}
          </Pressable>
        ))}
      </View>
      <Button label="Crear categoría" size="sm" wide onPress={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.soft, borderRadius: 16, padding: 14, marginTop: -10, marginBottom: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 15, letterSpacing: -0.15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiInput: { width: 62, textAlign: 'center', fontSize: 23, paddingHorizontal: 0 },
  nameInput: { flex: 1 },
  emojis: { marginTop: 11, flexGrow: 0 },
  emojisContent: { gap: 6, paddingBottom: 3 },
  emoji: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOn: { boxShadow: `inset 0 0 0 2px ${colors.ink}` },
  emojiText: { fontSize: 18 },
  colorLabel: { marginTop: 13 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 15 },
  color: { width: 28, height: 28, borderRadius: 14 },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
