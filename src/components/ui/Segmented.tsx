import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { makeStyles } from '@/theme';
import { AppText } from './AppText';

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** Control segmentado como el de iOS: una opción elegida entre pocas. */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (on) return;
              haptics.selection();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={option.label}
            style={[styles.option, on && styles.optionOn]}
          >
            <AppText style={[styles.label, on && styles.labelOn]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  track: {
    flexDirection: 'row',
    backgroundColor: c.ghost,
    borderRadius: 11,
    borderCurve: 'continuous',
    padding: 2,
  },
  option: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
  },
  optionOn: {
    // en oscuro, un gris apenas más claro que la pista (como el control de iOS)
    backgroundColor: t.scheme === 'dark' ? '#3A4743' : c.surface,
    boxShadow: t.scheme === 'dark' ? undefined : '0 1px 3px rgba(21,34,32,0.12)',
  },
  label: { fontSize: 13, color: c.ink2, fontWeight: '500' },
  labelOn: { color: c.ink, fontWeight: '600' },
}));
