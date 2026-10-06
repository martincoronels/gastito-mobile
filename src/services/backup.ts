import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppData } from '@/domain/types';
import type { DateKey, MonthKey } from '@/lib/dates';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/** Escribe el archivo en la caché de la app y abre la hoja de compartir de iOS (Guardar en Archivos, AirDrop, Mail…). */
async function shareTextFile(name: string, content: string, mimeType: string, UTI: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('No se puede compartir en este dispositivo');
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

export const exportBackup = (data: AppData, day: DateKey) =>
  shareTextFile(`gastito-${day}.json`, JSON.stringify(data, null, 2), 'application/json', 'public.json');

export const exportMonthCsv = (csv: string, month: MonthKey) =>
  shareTextFile(`gastito-${month}.csv`, csv, 'text/csv', 'public.comma-separated-values-text');

export type PickedBackup =
  { status: 'ok'; json: unknown } | { status: 'canceled' } | { status: 'too-large' } | { status: 'unreadable' };

/** Abre el selector de archivos de iOS y lee el JSON elegido (todavía sin validar). */
export async function pickBackup(): Promise<PickedBackup> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'canceled' };
  if ((asset.size ?? 0) > MAX_IMPORT_BYTES) return { status: 'too-large' };
  try {
    const text = await new File(asset.uri).text();
    return { status: 'ok', json: JSON.parse(text) as unknown };
  } catch {
    return { status: 'unreadable' };
  }
}
