import * as WebBrowser from 'expo-web-browser';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { useToast } from '@/components/feedback/ToastProvider';
import { useRevealInSheet } from '@/components/sheet/BottomSheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FieldLabel } from '@/components/ui/FieldLabel';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { PRIVACY_POLICY_URL } from '@/config';
import { monthCsv } from '@/domain/csv';
import { today } from '@/lib/dates';
import { exportBackup, exportMonthCsv, pickBackup } from '@/services/backup';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { colors } from '@/theme';

/** Ajustes: presupuesto, backups, categorías propias, privacidad y borrar todo. */
export function SettingsSheet() {
  const { data, ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const toast = useToast();
  const categories = useCategories();
  const reveal = useRevealInSheet();
  const budgetInput = useRef<TextInput>(null);

  const [budget, setBudget] = useState(data.settings.budget ? String(data.settings.budget) : '');
  const [armedCategory, setArmedCategory] = useState<string | null>(null);
  const [wipeArmed, setWipeArmed] = useState(false);

  const saveBudget = () => {
    const value = parseFloat(budget);
    actions.saveBudget(Number.isFinite(value) && value > 0 ? value : null);
    sheet.close();
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
    const picked = await pickBackup();
    if (picked.status === 'canceled') return;
    if (picked.status === 'too-large') toast('Ese archivo es demasiado grande para ser un backup de Gastito');
    else if (picked.status === 'unreadable') toast('Ese archivo no es un backup de Gastito');
    else if (actions.importBackup(picked.json)) sheet.close();
  });
  const openPrivacy = run(async () => {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  });

  // borrar pide un segundo toque, como en la web
  const deleteCategory = (id: string) => {
    if (armedCategory !== id) {
      setArmedCategory(id);
      toast('Tocá de nuevo para borrar la categoría');
      return;
    }
    setArmedCategory(null);
    actions.deleteCategory(id);
  };
  const wipe = () => {
    if (!wipeArmed) {
      setWipeArmed(true);
      toast('Tocá de nuevo para borrar todo');
      return;
    }
    actions.wipeAll();
    sheet.close();
  };

  return (
    <View>
      <View style={styles.field}>
        <FieldLabel>Presupuesto mensual (dejalo vacío si no querés uno)</FieldLabel>
        <TextField
          ref={budgetInput}
          value={budget}
          onChangeText={(text) => setBudget(text.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="Ej: 600000"
          returnKeyType="done"
          onSubmitEditing={saveBudget}
          onFocus={() => reveal(budgetInput.current)}
        />
      </View>
      <Button label="Guardar presupuesto" wide onPress={saveBudget} />

      <View style={styles.rows}>
        <SettingRow
          title="Exportar datos"
          text="Un archivo JSON con todo. Sirve de backup y para mudarte a otro dispositivo."
          action={<Button variant="ghost" size="sm" label="Descargar" onPress={exportJson} />}
        />
        <SettingRow
          title="Exportar el mes en CSV"
          text="Para abrirlo en Excel o Google Sheets."
          action={<Button variant="ghost" size="sm" label="Descargar" onPress={exportCsv} />}
        />
        <SettingRow
          title="Importar datos"
          text="Reemplaza lo que tengas cargado ahora."
          action={<Button variant="ghost" size="sm" label="Elegir archivo" onPress={importJson} />}
        />
        {categories.custom.length ? (
          <View style={[styles.block, styles.divider]}>
            <AppText style={styles.rowTitle}>Mis categorías</AppText>
            <AppText style={styles.rowText}>Las que creaste vos. Si borrás una, sus gastos pasan a “Otros”.</AppText>
            <View style={styles.myCategories}>
              {categories.custom.map((category) => (
                <View key={category.id} style={styles.myCategory}>
                  <CategoryChip category={category} size={26} iconSize={14} />
                  <AppText style={styles.myCategoryName}>{category.name}</AppText>
                  <Pressable
                    onPress={() => deleteCategory(category.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Borrar ${category.name}`}
                    style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
                  >
                    <Icon
                      name="close"
                      size={13}
                      color={armedCategory === category.id ? colors.dangerInk : colors.ink3}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <SettingRow
          title="Política de privacidad"
          text="Qué datos usa Gastito y dónde quedan guardados."
          action={<Button variant="ghost" size="sm" label="Ver" onPress={openPrivacy} />}
        />
        <SettingRow
          last
          title="Borrar todo"
          text="Se van los gastos, los fijos y el presupuesto. No hay vuelta atrás."
          action={<Button variant="danger" size="sm" label={wipeArmed ? 'Confirmar' : 'Borrar'} onPress={wipe} />}
        />
      </View>
      <AppText style={styles.note}>
        Tus datos viven en esta app, en este dispositivo. Nadie más los ve. Si desinstalás la app, se borran: exportá de
        vez en cuando.
      </AppText>
    </View>
  );
}

function SettingRow({
  title,
  text,
  action,
  last = false,
}: {
  title: string;
  text: string;
  action: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.rowTexts}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        <AppText style={styles.rowText}>{text}</AppText>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 15 },
  rows: { marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 2 },
  block: { paddingVertical: 14, paddingHorizontal: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  rowTexts: { flex: 1 },
  rowTitle: { fontSize: 14.5, lineHeight: 21 },
  rowText: { fontSize: 12.5, lineHeight: 18.1, color: colors.ink3, marginTop: 2, maxWidth: 290 },
  myCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  myCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.soft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 6,
  },
  myCategoryName: { fontSize: 12.5 },
  remove: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removePressed: { backgroundColor: colors.softPressed },
  note: { fontSize: 12.5, lineHeight: 18.1, color: colors.ink3, marginTop: 14 },
});
