import { useState, type Ref } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

export type TextFieldProps = TextInputProps & { ref?: Ref<TextInput> };

/** Campo de texto con el borde que se oscurece al enfocarlo, como en la web. */
export function TextField({ style, onFocus, onBlur, ref, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const { colors, scheme } = useTheme();
  const fieldStyles = useFieldStyles();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.ink3}
      selectionColor={colors.ink}
      keyboardAppearance={scheme}
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
export const useFieldStyles = makeStyles((c) => ({
  box: {
    height: 46,
    borderWidth: 1.5,
    borderColor: c.line,
    borderRadius: 12,
    backgroundColor: c.surface,
    paddingHorizontal: 13,
  },
  text: { fontSize: 16, color: c.ink },
  focused: { borderColor: c.ink },
}));
