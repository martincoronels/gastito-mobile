import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors } from '@/theme';

export type TextFieldProps = TextInputProps & { ref?: Ref<TextInput> };

/** Campo de texto con el borde que se oscurece al enfocarlo, como en la web. */
export function TextField({ style, onFocus, onBlur, ref, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.ink3}
      selectionColor={colors.ink}
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[fieldStyles.box, fieldStyles.text, focused && fieldStyles.focused, style]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
    />
  );
}

/** Lo comparten los campos que no son de texto (fecha, medio de pago) para verse iguales. */
export const fieldStyles = StyleSheet.create({
  box: {
    height: 46,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
  },
  text: { fontSize: 16, color: colors.ink },
  focused: { borderColor: colors.ink },
});
