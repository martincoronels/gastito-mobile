import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';

export function RepeatToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      style={styles.row}
    >
      <View style={styles.texts}>
        <AppText style={styles.title}>Se repite todos los meses</AppText>
        <AppText style={styles.hint}>Lo sumamos solo a la lista de fijos y te avisamos cada mes.</AppText>
      </View>
      <View style={[styles.box, value && styles.boxOn]}>
        {value ? <Icon name="check" size={14} color={colors.white} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.soft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  texts: { flex: 1 },
  title: { fontSize: 14, lineHeight: 20.3 },
  hint: { fontSize: 12.5, lineHeight: 18.1, color: colors.ink3 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.checkbox,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});
