import { useRef } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, radius } from '@/theme';

export function SearchField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const input = useRef<TextInput>(null);
  return (
    <Pressable style={styles.box} onPress={() => input.current?.focus()} accessible={false}>
      <Icon name="search" size={18} color={colors.ink3} />
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        placeholder="Buscar por nombre o categoría"
        placeholderTextColor={colors.ink3}
        selectionColor={colors.ink}
        style={styles.input}
        returnKeyType="search"
        enterKeyHint="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
        maxFontSizeMultiplier={1.4}
        accessibilityLabel="Buscar por nombre o categoría"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  input: { flex: 1, alignSelf: 'stretch', fontSize: 16, color: colors.ink, padding: 0 },
});
