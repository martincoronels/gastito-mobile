import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { makeStyles, useTheme } from '@/theme';

export function RepeatToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
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
        {value ? <Icon name="check" size={14} color={colors.onAccent} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.soft,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  texts: { flex: 1 },
  title: { fontSize: 14, lineHeight: 20.3 },
  hint: { fontSize: 12.5, lineHeight: 18.1, color: c.ink3 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: c.checkbox,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: c.accent, borderColor: c.accent },
}));
