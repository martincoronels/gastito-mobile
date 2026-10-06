import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Alert, Platform, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { formatTime, type ReminderPreferences } from '@/domain/preferences';
import { haptics } from '@/lib/haptics';
import { getPermission, openSystemSettings, requestPermission } from '@/services/notifications';
import { usePreferences } from '@/state/PreferencesProvider';
import { makeStyles, useTheme } from '@/theme';
import { SettingsSection, SettingsSwitchRow } from './SettingsList';

type ReminderKey = 'fixed' | 'daily' | 'monthly';

const TINT = { fixed: '#E0452F', daily: '#5B45C7', monthly: '#1F7A4C' } as const;

/**
 * Recordatorios: todos apagados de entrada. El permiso de notificaciones se pide recién al activar
 * el primero (nunca al abrir la app), como recomienda Apple.
 */
export function ReminderSettings() {
  const { prefs, update } = usePreferences();
  const { reminders } = prefs;
  const styles = useStyles();

  const set = (patch: Partial<ReminderPreferences>) =>
    update((p) => ({ ...p, reminders: { ...p.reminders, ...patch } }));

  const toggle = async (key: ReminderKey, on: boolean) => {
    if (!on) {
      set({ [key]: false });
      return;
    }
    let permission = await getPermission();
    if (permission === 'undetermined') permission = await requestPermission();
    if (permission === 'granted') {
      haptics.success();
      set({ [key]: true });
      return;
    }
    if (permission === 'unavailable') return;
    Alert.alert(
      'Activá las notificaciones',
      'Para avisarte, Gastito necesita permiso. Lo podés dar en Ajustes → Gastito → Notificaciones.',
      [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => void openSystemSettings() },
      ],
    );
  };

  return (
    <SettingsSection
      title="Recordatorios"
      footer="Los avisos los arma tu iPhone: no pasan por ningún servidor. Si activás el bloqueo, no muestran montos."
    >
      <SettingsSwitchRow
        icon="repeat"
        tint={TINT.fixed}
        title="Gastos fijos"
        detail="El día que vence cada uno, con un botón para registrarlo"
        value={reminders.fixed}
        onValueChange={(on) => void toggle('fixed', on)}
      />
      <SettingsSwitchRow
        icon="bell"
        tint={TINT.daily}
        title="Recordatorio diario"
        detail="Solo los días que no anotaste nada"
        value={reminders.daily}
        onValueChange={(on) => void toggle('daily', on)}
      />
      {reminders.daily ? (
        <View style={styles.timeRow}>
          <AppText style={styles.timeLabel}>Hora del recordatorio</AppText>
          <TimePicker minutes={reminders.dailyAt} onChange={(dailyAt) => set({ dailyAt })} />
        </View>
      ) : null}
      <SettingsSwitchRow
        icon="calendar"
        tint={TINT.monthly}
        title="Resumen del mes"
        detail="El 1° de cada mes, cómo te fue en el anterior"
        value={reminders.monthly}
        onValueChange={(on) => void toggle('monthly', on)}
      />
    </SettingsSection>
  );
}

/** El selector de hora nativo: en iOS, la píldora compacta que abre la ruedita. */
function TimePicker({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const value = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  const pick = (date?: Date) => {
    if (date) onChange(date.getHours() * 60 + date.getMinutes());
  };

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        locale="es-AR"
        minuteInterval={5}
        themeVariant={scheme}
        accentColor={colors.ink}
        accessibilityLabel="Hora del recordatorio diario"
        onChange={(event, date) => event.type === 'set' && pick(date)}
      />
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hora del recordatorio: ${formatTime(minutes)}`}
      onPress={() => {
        if (Platform.OS === 'android') {
          DateTimePickerAndroid.open({
            value,
            mode: 'time',
            is24Hour: true,
            onChange: (event, date) => event.type === 'set' && pick(date),
          });
        }
      }}
      style={styles.timeButton}
    >
      <AppText style={styles.timeText}>{formatTime(minutes)}</AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 50,
    paddingVertical: 8,
    paddingLeft: 55,
    paddingRight: 14,
  },
  timeLabel: { fontSize: 15 },
  timeButton: { backgroundColor: c.ghost, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  timeText: { fontSize: 15, fontVariant: ['tabular-nums'] },
}));
