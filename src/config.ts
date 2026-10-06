/** Clave donde se guardan los datos: la misma que la web, así los backups son compatibles entre las dos. */
export const STORAGE_KEY = 'gastito.v1';

/** Si lo guardado se daña, se copia acá antes de empezar de cero (nunca se pisa sin copia). */
export const RECOVERY_KEY = 'gastito.v1.recovery';

/** Preferencias de este dispositivo (apariencia, recordatorios, bloqueo). No viajan en los backups. */
export const PREFERENCES_KEY = 'gastito.prefs.v1';

/**
 * Páginas públicas. Apple exige la política de privacidad dentro de la app (pauta 5.1.1) y la
 * misma URL en App Store Connect, más una URL de soporte. Subí los archivos de docs/ a tu sitio y
 * poné acá las URL finales (`npm run check:release` avisa si quedó algo sin completar).
 */
export const PRIVACY_POLICY_URL = 'https://gastito-beta.pages.dev/privacidad';
export const TERMS_URL = 'https://gastito-beta.pages.dev/terminos';
export const SUPPORT_URL = 'https://gastito-beta.pages.dev/soporte';

/** Esquema de los links profundos: gastito://anotar, gastito://resumen… (también en app.json). */
export const URL_SCHEME = 'gastito';
