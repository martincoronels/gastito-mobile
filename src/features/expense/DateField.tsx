import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRef } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';

import { useRevealInSheet } from '@/components/sheet/BottomSheet';
import { AppText } from '@/components/ui/AppText';
import { useFieldStyles } from '@/components/ui/TextField';
import { parseDateKey, shortDate, toDateKey, type DateKey } from '@/lib/dates';
import { makeStyles, useTheme } from '@/theme';

interface DateFieldProps {
  value: DateKey;
  /** El calendario está abierto debajo */
  open: boolean;
  onToggle: () => void;
  onChange: (date: DateKey) => void;
}

/** El campo de fecha. En iOS abre el calendario nativo debajo; en Android, el diálogo del sistema. */
export function DateField({ value, open, onToggle, onChange }: DateFieldProps) {
  const fieldStyles = useFieldStyles();
  const styles = useStyles();
  const press = () => {
    Keyboard.dismiss();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseDateKey(value),
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toDateKey(date));
        },
      });
      return;
    }
    onToggle();
  };
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={`Fecha: ${shortDate(value)}`}
      accessibilityHint="Abre el calendario"
      style={[fieldStyles.box, styles.field, open && fieldStyles.focused]}
    >
      <AppText style={fieldStyles.text} numberOfLines={1}>
        {shortDate(value)}
      </AppText>
    </Pressable>
  );
}

/** El calendario de iOS, debajo de la fila de fecha y medio de pago. */
export function InlineCalendar({ value, onChange }: { value: DateKey; onChange: (date: DateKey) => void }) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const reveal = useRevealInSheet();
  const box = useRef<View>(null);
  const handle = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) onChange(toDateKey(date));
  };
  if (Platform.OS !== 'ios') return null;
  return (
    <View ref={box} style={styles.calendar} onLayout={() => reveal(box.current, { immediate: true })}>
      <DateTimePicker
        value={parseDateKey(value)}
        mode="date"
        display="inline"
        locale="es-AR"
        themeVariant={scheme}
        accentColor={colors.ink}
        onChange={handle}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  field: { justifyContent: 'center' },
  calendar: {
    backgroundColor: c.soft,
    borderRadius: 16,
    marginTop: -4,
    marginBottom: 15,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
}));
