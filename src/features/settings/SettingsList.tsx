import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/icons';
import { makeStyles, useTheme } from '@/theme';

/** Un grupo de filas con su título, como las secciones de la app Ajustes de iOS. */
export function SettingsSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement<{ icon?: IconName }>);
  return (
    <View style={styles.section}>
      {title ? (
        <AppText style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {/* como en iOS, la línea arranca donde empieza el texto */}
            {i > 0 ? <View style={[styles.separator, row.props.icon ? styles.separatorInset : null]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <AppText style={styles.footer}>{footer}</AppText> : null}
    </View>
  );
}

interface RowBase {
  title: string;
  detail?: string;
  icon?: IconName;
  /** Color del círculo del ícono */
  tint?: string;
}

/** Fila que hace algo al tocarla (abre, exporta, borra). */
export function SettingsRow({
  title,
  detail,
  icon,
  tint,
  value,
  onPress,
  destructive = false,
  accessory = 'chevron',
  accessibilityHint,
}: RowBase & {
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  accessory?: 'chevron' | 'external' | 'none';
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessory === 'external' ? 'link' : 'button'}
      accessibilityLabel={[title, value, detail].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {icon ? <RowIcon icon={icon} tint={destructive ? colors.dangerInk : tint} /> : null}
      <View style={styles.texts}>
        <AppText style={[styles.title, destructive && styles.destructive]}>{title}</AppText>
        {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      </View>
      {value ? <AppText style={styles.value}>{value}</AppText> : null}
      {accessory === 'chevron' ? <Icon name="right" size={16} color={colors.ink3} strokeWidth={2.2} /> : null}
      {accessory === 'external' ? <Icon name="share" size={16} color={colors.ink3} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** Fila con un interruptor nativo de iOS. */
export function SettingsSwitchRow({
  title,
  detail,
  icon,
  tint,
  value,
  onValueChange,
  disabled = false,
}: RowBase & { value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {icon ? <RowIcon icon={icon} tint={tint} /> : null}
      <View style={styles.texts} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText style={styles.title}>{title}</AppText>
        {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.ok, false: colors.ghostPressed }}
        ios_backgroundColor={colors.ghostPressed}
        accessibilityLabel={title}
        accessibilityHint={detail}
      />
    </View>
  );
}

/** Contenido libre dentro de una sección (un campo, un control segmentado). */
export function SettingsBlock({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.block}>{children}</View>;
}

function RowIcon({ icon, tint }: { icon: IconName; tint?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.icon, { backgroundColor: tint ?? colors.ink2 }]}>
      <Icon name={icon} size={16} color="#FFFFFF" strokeWidth={2.1} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { marginTop: 22 },
  sectionTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: c.ink3,
    marginLeft: 14,
    marginBottom: 7,
  },
  card: { backgroundColor: c.soft, borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden' },
  separator: { height: 1, backgroundColor: c.lineSoft, marginLeft: 14 },
  separatorInset: { marginLeft: 55 },
  footer: { fontSize: 12.5, lineHeight: 17.5, color: c.ink3, marginTop: 7, marginHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowPressed: { backgroundColor: c.softPressed },
  disabled: { opacity: 0.45 },
  icon: {
    width: 29,
    height: 29,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 20 },
  destructive: { color: c.dangerInk, fontWeight: '500' },
  detail: { fontSize: 12.5, lineHeight: 17.5, color: c.ink3 },
  value: { fontSize: 14.5, color: c.ink3, fontVariant: ['tabular-nums'] },
  block: { paddingVertical: 12, paddingHorizontal: 14 },
}));
