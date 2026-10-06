import { ActionSheetIOS, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { fieldStyles } from '@/components/ui/TextField';
import { PAYMENT_METHODS } from '@/domain/catalog';
import type { PaymentMethod } from '@/domain/types';
import { colors } from '@/theme';

interface MethodFieldProps {
  value: PaymentMethod;
  /** Solo fuera de iOS: la lista de opciones está abierta debajo */
  listOpen: boolean;
  onChange: (method: PaymentMethod) => void;
  onToggleList: () => void;
}

/** El "select" de medio de pago: en iOS abre la hoja de acciones nativa. */
export function MethodField({ value, listOpen, onChange, onToggleList }: MethodFieldProps) {
  const press = () => {
    Keyboard.dismiss();
    if (Platform.OS !== 'ios') {
      onToggleList();
      return;
    }
    const options = [...PAYMENT_METHODS, 'Cancelar'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Medio de pago',
        options,
        cancelButtonIndex: options.length - 1,
        userInterfaceStyle: 'light',
        tintColor: colors.ink,
      },
      (index) => {
        const method = PAYMENT_METHODS[index];
        if (method) onChange(method);
      },
    );
  };
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={`Medio de pago: ${value}`}
      style={[fieldStyles.box, styles.field, listOpen && fieldStyles.focused]}
    >
      <AppText style={[fieldStyles.text, styles.value]} numberOfLines={1}>
        {value}
      </AppText>
      <Icon name="chevronDown" size={16} color={colors.ink2} strokeWidth={2.2} />
    </Pressable>
  );
}

/** Lista de opciones para Android (en iOS se usa la hoja de acciones). */
export function MethodOptions({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <View style={styles.options}>
      {PAYMENT_METHODS.map((method) => (
        <Pressable
          key={method}
          onPress={() => onChange(method)}
          accessibilityRole="button"
          accessibilityState={{ selected: method === value }}
          style={({ pressed }) => [styles.option, (pressed || method === value) && styles.optionOn]}
        >
          <AppText>{method}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 11 },
  value: { flex: 1 },
  options: { backgroundColor: colors.soft, borderRadius: 14, padding: 4, marginTop: -4, marginBottom: 15 },
  option: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  optionOn: { backgroundColor: colors.surface },
});
