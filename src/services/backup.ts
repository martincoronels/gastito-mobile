import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppData } from '@/domain/types';
import type { DateKey, MonthKey } from '@/lib/dates';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/** Carpeta temporal de los archivos exportados: se vacía antes de cada exportación y al abrir la app. */
const exportsDir = () => new Directory(Paths.cache, 'exports');

/** Borra los archivos que quedaron de exportaciones anteriores (tienen todos tus datos). */
export function clearExports(): void {
  try {
    const dir = exportsDir();
    if (dir.exists) dir.delete();
  } catch {
    // es solo limpieza: si falla, iOS igual vacía la caché cuando necesita espacio
  }
}

/** Escribe el archivo en la caché de la app y abre la hoja de compartir de iOS (Guardar en Archivos, AirDrop, Mail…). */
async function shareTextFile(name: string, content: string, mimeType: string, UTI: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('No se puede compartir en este dispositivo');
  clearExports();
  const dir = exportsDir();
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, name);
  file.create();
  file.write(content);
  // el archivo no se borra al cerrar la hoja: algunos destinos lo copian después; se limpia en la próxima
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
  const file = new File(asset.uri);
  try {
    const size = asset.size ?? (file.exists ? file.size : 0);
    if (size > MAX_IMPORT_BYTES) return { status: 'too-large' };
    const text = await file.text();
    if (text.length > MAX_IMPORT_BYTES) return { status: 'too-large' };
    return { status: 'ok', json: JSON.parse(text) as unknown };
  } catch {
    return { status: 'unreadable' };
  } finally {
    // es la copia que hizo el selector en la caché de la app: ya no hace falta
    try {
      if (file.exists) file.delete();
    } catch {
      // nada
    }
  }
}
