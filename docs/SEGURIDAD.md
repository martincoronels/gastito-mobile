# Seguridad y privacidad de Gastito

Revisión hecha en octubre de 2026 para la versión 1.0.0. Resume qué protege la app, cómo, y qué
quedó evaluado y descartado a propósito.

## Modelo

Gastito no tiene servidor, cuentas ni conexión a internet para funcionar: los datos nunca salen del
iPhone salvo que la persona los exporte. Por eso no hay datos en tránsito que proteger ni una base
de datos remota que pueda filtrarse. Los riesgos que importan son:

1. Alguien con el iPhone desbloqueado en la mano.
2. Un archivo malicioso que la persona importa (o un link `gastito://` armado por otro).
3. Perder datos por un error de la app (lectura fallida, archivo dañado, borrado accidental).
4. Dependencias de terceros.

## Qué hace la app

| Riesgo | Medida | Dónde |
| --- | --- | --- |
| Alguien abre la app | Bloqueo opcional con Face ID / Touch ID / código. Se vuelve a pedir al volver de segundo plano. Si Face ID falla, iOS ofrece el código. | `src/state/LockProvider.tsx` |
| Montos en el selector de apps | Con el bloqueo activado, la app se tapa al dejar de estar activa (pantalla propia + desenfoque nativo de respaldo). | `src/components/brand/LockLayer.tsx`, `src/services/lock.ts` |
| Montos en la pantalla bloqueada | Con el bloqueo activado, las notificaciones no muestran montos. | `src/domain/reminders.ts` |
| Datos biométricos | La app nunca los ve: iOS responde solo sí o no (`LocalAuthentication`). | `src/services/lock.ts` |
| Datos en el teléfono | Almacenamiento privado de la app, cifrado por iOS (protección de datos por defecto). | `src/storage/` |
| Archivo importado malicioso | Límite de 10 MB; cada registro se reconstruye campo por campo (ids, montos, fechas válidas, colores hexadecimales, textos sin caracteres de control y recortados); lo inválido se descarta. | `src/domain/sanitize.ts`, `src/services/backup.ts` |
| Fórmulas en el CSV exportado | Celdas que empiezan con `= + - @` llevan un apóstrofo (CSV injection). | `src/domain/csv.ts` |
| Link `gastito://` malicioso | Rutas en lista blanca, parámetros validados, largo máximo; un link nunca guarda ni borra: solo abre una pantalla o el formulario precargado. | `src/domain/links.ts` |
| Archivos con datos en la caché | Las exportaciones van a una carpeta temporal que se vacía al exportar y al abrir la app; la copia del backup importado se borra después de leerla. | `src/services/backup.ts` |
| Pérdida de datos por lectura fallida | Si no se puede leer, la app muestra un error con «Reintentar» y no guarda encima. Si lo guardado está dañado, se copia aparte antes de empezar de cero. Si un guardado falla, se avisa y se reintenta. | `src/state/AppStateProvider.tsx`, `src/state/usePersistence.ts` |
| Borrados accidentales | Confirmación nativa para borrar todo, borrar categorías e importar encima; «Deshacer» al borrar gastos y fijos. | `src/state/useAppActions.ts` |
| Tráfico de red | No hay. App Transport Security queda en su valor seguro (sin cargas arbitrarias). Las páginas legales se abren en el navegador de iOS. | `Info.plist` generado |
| Seguimiento | Ninguno: sin analíticas, publicidad ni identificador de publicidad. Manifiesto de privacidad con `NSPrivacyTracking = false` y sin datos recopilados. | `app.json` |

## Permisos que pide

| Permiso | Cuándo | Para qué |
| --- | --- | --- |
| Notificaciones | Solo al activar un recordatorio en Ajustes (nunca al abrir la app) | Recordatorios locales; no hay notificaciones push ni servidor |
| Face ID | Solo al activar el bloqueo | Verificar que sos vos |

No pide contactos, fotos, ubicación, cámara, micrófono, calendario ni seguimiento (ATT).

## Dependencias (`npm audit`)

`npm audit` reporta vulnerabilidades altas y moderadas en `braces`, `micromatch`, `node-forge`,
`js-yaml`, `sprintf-js` y `uuid`. **Ninguna llega a la app**: son parte de las herramientas que corren
en la computadora para compilar y testear (Metro, Jest, Expo CLI, el generador del proyecto de Xcode).

Se verificó con el mapa de fuentes del bundle de iOS (`npx expo export --platform ios --source-maps`):
de esos paquetes, lo único incluido es el `require` de Metro (el sistema de módulos), no el código
vulnerable. `npm audit fix --force` las "arreglaría" bajando o subiendo versiones que rompen el SDK 57,
así que no se aplica: se resuelven con las actualizaciones de Expo (`npx expo install --fix` dentro
del SDK, o el próximo SDK).

## Evaluado y descartado

- **Protección de datos «Complete» (`NSFileProtectionComplete`).** Haría los datos ilegibles con el
  iPhone bloqueado. La app ya usa la protección por defecto de iOS (cifrado hasta el primer desbloqueo)
  y no corre nada en segundo plano, así que la ganancia es mínima frente al riesgo de un guardado que
  falle justo al bloquear el teléfono. Queda como mejora posible.
- **Llavero (Keychain) para la preferencia de bloqueo.** Quien pudiera modificar el almacenamiento de
  la app ya tendría acceso a los datos; el llavero no agrega protección real acá.
- **Impedir capturas de pantalla.** Son útiles para compartir un resumen; con el bloqueo activado igual
  se tapa el selector de apps.

## Para mantener

- Antes de cada versión: `npm run verify` y `npm run check:release`.
- Mantener el SDK al día (`npx expo install --fix`) para recibir correcciones de dependencias.
- Si algún día se agrega un servidor o analíticas, actualizar la política de privacidad, la ficha de
  privacidad de App Store Connect y el manifiesto de privacidad **antes** de publicar.
