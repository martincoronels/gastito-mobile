import * as Application from 'expo-application';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { useToast } from '@/components/feedback/ToastProvider';
import { useRevealInSheet } from '@/components/sheet/BottomSheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_URL } from '@/config';
import { monthCsv } from '@/domain/csv';
import { isEmptyData } from '@/domain/operations';
import type { AppearancePreference } from '@/domain/preferences';
import type { Category } from '@/domain/types';
import { parseWholeAmount, wholeAmountInput } from '@/lib/amountInput';
import { confirm } from '@/lib/confirm';
import { monthName, today } from '@/lib/dates';
import { formatInteger } from '@/lib/money';
import { plural } from '@/lib/text';
import { exportBackup, exportMonthCsv, pickBackup } from '@/services/backup';
import { useAppState } from '@/state/AppStateProvider';
import { useLock } from '@/state/LockProvider';
import { usePreferences } from '@/state/PreferencesProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { makeStyles, useTheme } from '@/theme';
import { ReminderSettings } from './ReminderSettings';
import { SettingsBlock, SettingsRow, SettingsSection, SettingsSwitchRow } from './SettingsList';

const APPEARANCE_OPTIONS: readonly { value: AppearancePreference; label: string }[] = [
  { value: 'system', label: 'Automática' },
  { value: 'light', label: 'Clara' },
  { value: 'dark', label: 'Oscura' },
];

/** Colores de los íconos de cada fila (los de las categorías, como los íconos de Ajustes de iOS). */
const TINT = {
  lock: '#1F7A4C',
  export: '#2D5FD1',
  csv: '#0E8579',
  import: '#D2851B',
  privacy: '#6E7A72',
  terms: '#7A5C33',
  support: '#1481A8',
} as const;

/** Ajustes: presupuesto, apariencia, tus datos, privacidad y acerca de. */
export function SettingsSheet() {
  const styles = useStyles();
  const { data, ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const toast = useToast();
  const categories = useCategories();
  const reveal = useRevealInSheet();
  const { prefs, update } = usePreferences();
  const lock = useLock();
  const lockMethod = lock.capability?.available ? lock.capability.method : 'Face ID';
  const budgetInput = useRef<TextInput>(null);
  const [budget, setBudget] = useState(data.settings.budget ? formatInteger(data.settings.budget) : '');

  const saveBudget = () => {
    actions.saveBudget(parseWholeAmount(budget));
    budgetInput.current?.blur();
  };

  const run = (task: () => Promise<void>) => () => {
    task().catch(() => toast('No se pudo completar. Probá de nuevo.'));
  };

  const exportJson = run(() => exportBackup(data, today()));
  const exportCsv = run(() =>
    exportMonthCsv(
      monthCsv(data, ui.month, (id) => categories.get(id).name),
      ui.month,
    ),
  );
  const importJson = run(async () => {
    if (!isEmptyData(data)) {
      const ok = await confirm({
        title: '¿Reemplazar tus datos?',
        message: `Lo que tengas ahora (${plural(data.expenses.length, 'gasto', 'gastos')}) se reemplaza por lo del backup. Si querés, exportá antes una copia.`,
        confirmLabel: 'Elegir backup',
      });
      if (!ok) return;
    }
    const picked = await pickBackup();
    if (picked.status === 'canceled') return;
    if (picked.status === 'too-large') toast('Ese archivo es demasiado grande para ser un backup de Gastito');
    else if (picked.status === 'unreadable') toast('Ese archivo no es un backup de Gastito');
    else if (actions.importBackup(picked.json)) sheet.close();
  });
  const open = (url: string) =>
    run(async () => {
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
    });

  const deleteCategory = async (category: Category) => {
    const count = data.expenses.filter((e) => e.categoryId === category.id).length;
    const ok = await confirm({
      title: `¿Borrar «${category.name}»?`,
      message: count
        ? `${plural(count, 'gasto pasa', 'gastos pasan')} a «Otros». No se borra ningún gasto.`
        : 'No tiene gastos anotados.',
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (ok) actions.deleteCategory(category.id);
  };

  const wipe = async () => {
    const ok = await confirm({
      title: '¿Borrar todo?',
      message: 'Se van los gastos, los fijos, tus categorías y el presupuesto de este iPhone.',
      confirmLabel: 'Borrar todo',
      destructive: true,
    });
    if (!ok) return;
    actions.wipeAll();
    sheet.close();
  };

  const version = [Application.nativeApplicationVersion, Application.nativeBuildVersion].filter(Boolean);

  return (
    <View style={styles.root}>
      <SettingsSection
        title="Presupuesto mensual"
        footer="Te avisamos al llegar al 80% y al pasarte. Dejalo vacío si no querés uno."
      >
        <SettingsBlock>
          <View style={styles.budgetRow}>
            <View style={styles.budgetField}>
              <AppText style={styles.currency}>$</AppText>
              <TextField
                ref={budgetInput}
                value={budget}
                onChangeText={(text) => setBudget(wholeAmountInput(text))}
                keyboardType="number-pad"
                placeholder="600.000"
                returnKeyType="done"
                accessibilityLabel="Presupuesto mensual"
                onSubmitEditing={saveBudget}
                onFocus={() => reveal(budgetInput.current)}
                style={styles.budgetInput}
              />
            </View>
            <Button label="Guardar" size="sm" onPress={saveBudget} />
          </View>
        </SettingsBlock>
      </SettingsSection>

      <SettingsSection title="Apariencia">
        <SettingsBlock>
          <Segmented
            accessibilityLabel="Apariencia"
            options={APPEARANCE_OPTIONS}
            value={prefs.appearance}
            onChange={(appearance) => update((p) => ({ ...p, appearance }))}
          />
        </SettingsBlock>
      </SettingsSection>

      <ReminderSettings />

      <SettingsSection
        title="Tus datos"
        footer="Viven en esta app, en este iPhone: nadie más los ve. Si desinstalás Gastito se borran, así que exportá de vez en cuando."
      >
        <SettingsRow
          icon="share"
          tint={TINT.export}
          title="Exportar backup"
          detail="Un archivo con todo, para guardar o pasar a otro iPhone"
          accessory="none"
          onPress={exportJson}
        />
        <SettingsRow
          icon="doc"
          tint={TINT.csv}
          title={`Exportar ${monthName(ui.month)} en CSV`}
          detail="Para abrirlo en Excel, Numbers o Google Sheets"
          accessory="none"
          onPress={exportCsv}
        />
        <SettingsRow
          icon="tray"
          tint={TINT.import}
          title="Importar backup"
          detail="Reemplaza lo que tengas cargado"
          accessory="none"
          onPress={importJson}
        />
      </SettingsSection>

      {categories.custom.length ? (
        <SettingsSection title="Mis categorías" footer="Si borrás una, sus gastos pasan a «Otros».">
          <SettingsBlock>
            <View style={styles.myCategories}>
              {categories.custom.map((category) => (
                <MyCategory key={category.id} category={category} onDelete={() => void deleteCategory(category)} />
              ))}
            </View>
          </SettingsBlock>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Privacidad"
        footer={
          lock.capability && !lock.capability.available
            ? 'Para usar el bloqueo, configurá un código en Ajustes de iOS → Face ID y código.'
            : undefined
        }
      >
        <SettingsSwitchRow
          icon="lock"
          tint={TINT.lock}
          title={lockMethod === 'el código' ? 'Bloquear con el código' : `Bloquear con ${lockMethod}`}
          detail="Lo pide al abrir Gastito y oculta tus montos en el selector de apps"
          value={prefs.lock}
          disabled={lock.authenticating}
          onValueChange={(on) => void (on ? lock.enableLock() : lock.disableLock())}
        />
        <SettingsRow
          icon="shield"
          tint={TINT.privacy}
          title="Política de privacidad"
          detail="Qué datos usa Gastito y dónde quedan"
          onPress={open(PRIVACY_POLICY_URL)}
        />
        <SettingsRow icon="doc" tint={TINT.terms} title="Términos de uso" onPress={open(TERMS_URL)} />
      </SettingsSection>

      <SettingsSection title="Ayuda">
        <SettingsRow
          icon="help"
          tint={TINT.support}
          title="Soporte y preguntas frecuentes"
          onPress={open(SUPPORT_URL)}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow title="Borrar todo" destructive accessory="none" onPress={() => void wipe()} />
      </SettingsSection>

      <AppText style={styles.version}>
        Gastito{version.length ? ` ${version[0]}${version[1] ? ` (${version[1]})` : ''}` : ''}
      </AppText>
    </View>
  );
}

function MyCategory({ category, onDelete }: { category: Category; onDelete: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.myCategory}>
      <CategoryChip category={category} size={26} iconSize={14} />
      <AppText style={styles.myCategoryName}>{category.name}</AppText>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Borrar ${category.name}`}
        style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
      >
        <Icon name="close" size={13} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { marginTop: -10 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetField: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  currency: { position: 'absolute', left: 13, zIndex: 1, fontSize: 16, color: c.ink3 },
  budgetInput: { flex: 1, minWidth: 0, paddingLeft: 28, fontVariant: ['tabular-nums'] },
  myCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  myCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: c.surface,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 6,
  },
  myCategoryName: { fontSize: 12.5 },
  remove: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removePressed: { backgroundColor: c.softPressed },
  version: { fontSize: 12, color: c.ink3, textAlign: 'center', marginTop: 22 },
}));
