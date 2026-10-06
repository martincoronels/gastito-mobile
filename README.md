# Gastito para iPhone

Versión nativa de **Gastito** (React Native + Expo SDK 57): las mismas pantallas, colores, tipografía,
textos y el mismo formato de datos que la web, más lo que hace que se sienta de iPhone.

## Qué tiene de iPhone

- **Avisos que salen de la Dynamic Island** (en iPhone sin isla, bajan desde arriba), con «Deshacer».
- **Gestos**: deslizar un gasto para eliminarlo o anotarlo otra vez; deslizar la dona para cambiar de
  mes; deslizar un fijo para pausarlo o borrarlo. Una fila abierta a la vez, como en Mail.
- **Vibraciones** (Taptic Engine) con el mismo significado en toda la app.
- **Modo oscuro** que sigue a iOS o se elige en Ajustes, con ícono oscuro y tintado (iOS 18+).
- **Liquid Glass** en iOS 26: barra de pestañas flotante de vidrio y botón + de vidrio teñido.
- **Recordatorios locales** opcionales: vencimiento de fijos (con botón «Registrar» en la
  notificación), diario (solo si ese día no anotaste nada) y resumen del mes.
- **Bloqueo con Face ID** y montos ocultos en el selector de apps.
- **Atajos y botón de Acción**: links `gastito://anotar?monto=…&categoria=…`, `gastito://resumen`…
- **Controles nativos**: alertas de confirmación, hoja de acciones, calendario y hora, switches,
  hoja de compartir y selector de archivos.
- **Accesibilidad**: VoiceOver (con las acciones de deslizar), tamaño de letra, «Reducir
  movimiento», «Aumentar contraste» y «Reducir transparencia».

## Requisitos

- macOS con Xcode 26 o 27 (Xcode 27 reemplaza Simulator.app por **Device Hub**; Expo lo detecta solo).
- Node.js 20.19 o superior (recomendado: 22 LTS).
- VS Code: al abrir la carpeta te sugiere las extensiones (Expo Tools, ESLint, Prettier).

## Probarla en el simulador (Device Hub)

```bash
npm install
npx expo start
```

Con el servidor andando, apretá **`i`**: Expo abre el simulador en Device Hub, instala Expo Go y
carga la app. Cada vez que guardás un archivo se recarga sola (`r` recarga a mano, **Cmd+D** en el
simulador abre el menú de desarrollo).

En la primera pantalla tocá **«Ver un mes de ejemplo»** para cargar datos.

> En un iPhone físico con Expo Go hay que iniciar sesión con la misma cuenta de Expo en la terminal
> (`npx expo login`) y en la app. En el simulador no hace falta. En Expo Go, Face ID puede pedir el
> código y Liquid Glass depende de cómo esté compilado Expo Go: la prueba final es en TestFlight.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run verify` | Tipos + lint + tests: lo que tiene que pasar antes de cada commit |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run lint` | ESLint con la configuración de Expo |
| `npm test` | Tests (Jest + Testing Library): dominio, estado y flujos completos de la app |
| `npm run check:release` | Revisión antes de publicar (páginas legales, ícono, permisos, cifrado…) |
| `npm run format` | Formatea `src/` con Prettier |
| `npm run doctor` | Revisa versiones y configuración (expo-doctor) |
| `npm run build:ios` | Compila para la App Store con EAS |
| `npm run submit:ios` | Sube la última compilación a App Store Connect |

## Estructura

```
src/
  App.tsx        raíz: providers (preferencias, tema, bloqueo, avisos, datos, hojas) y arranque
  config.ts      claves de guardado, URLs públicas y esquema de links
  domain/        reglas de negocio puras (sin React): tipos, categorías, operaciones, cálculos,
                 recordatorios, links, preferencias, validación de backups, CSV, datos de ejemplo
  lib/           utilidades: fechas, montos, campos de monto, texto, ids, hápticos, confirmaciones
  storage/       dónde se guardan los datos y las preferencias (interfaz + AsyncStorage)
  services/      lo que habla con iOS: backups, notificaciones, Face ID, calificación
  state/         estado global (reducer + context), guardado, preferencias, bloqueo, hojas,
                 acciones, recordatorios y links entrantes
  theme/         paletas clara y oscura, tipografía, medidas y makeStyles
  components/    piezas reutilizables: botones, campos, íconos, filas deslizables, vidrio,
                 hoja inferior, avisos, encabezado, barra flotante, apertura y bloqueo
  features/      cada sección: summary (Resumen), movements (Movimientos), fixed (Fijos),
                 expense (hoja de gasto), settings (Ajustes)
  screens/       HomeScreen, que arma todo
scripts/         check-release.mjs (revisión antes de publicar)
assets/          íconos 1024×1024 (claro sin transparencia, oscuro y tintado) y fuentes
docs/            guía para publicar, seguridad, y las páginas de privacidad, términos y soporte
```

Las dependencias van en un solo sentido: `features` → `state` → `domain` → `lib`. El dominio no
conoce React ni el almacenamiento, así que se testea solo y se reutiliza tal cual si mañana hay un
backend. Los servicios (`services/`) son la única parte que llama a módulos nativos.

## Decisiones

- **Sin backend.** Los datos quedan en el teléfono (AsyncStorage, el equivalente a `localStorage`).
  Sin cuentas no hay que implementar el borrado de cuenta que exige Apple y la ficha de privacidad es
  «No se recopilan datos». Para pasar a una base de datos se escribe otra implementación de
  `DataRepository` (`src/storage`) y el resto no cambia.
- **Nunca se guarda encima de algo que no se pudo leer.** Si la lectura falla, la app muestra un
  error con «Reintentar»; si lo guardado está dañado, se copia aparte antes de empezar de cero.
- **Backups compatibles con la web.** Misma clave (`gastito.v1`) y mismo JSON: un backup exportado
  desde la web se importa en la app y al revés. Todo lo importado pasa por `sanitizeData`. Las
  preferencias del dispositivo (apariencia, recordatorios, bloqueo) se guardan aparte y no viajan en
  los backups.
- **Notificaciones locales, no push.** Los recordatorios los programa el iPhone (`planReminders` es
  una función pura); no hace falta servidor ni clave de push.
- **Un link nunca cambia datos.** `gastito://` solo abre pantallas o el formulario precargado.
- **Una sola pantalla con tres secciones**, como la web; no hace falta un router.
- **Compatible con Expo Go.** Todas las librerías nativas que usa vienen incluidas en Expo Go, así que
  para desarrollar no hace falta compilar nada. Por eso no hay widgets ni Live Activities todavía:
  necesitan una extensión nativa y probarse en un iPhone (además, una Live Activity dura como mucho
  8 horas, y un presupuesto mensual no encaja en ese formato).
- **Lista para Xcode 27.** `expo-build-properties` activa el ciclo de vida por escenas que exige el
  SDK de iOS 27 (sin eso, una app SDK 57 compilada con Xcode 27 abre en negro).

## Diferencias con la web (a propósito)

- **Comparación justa con el mes pasado:** en el mes en curso se compara contra lo gastado a esta
  altura del mes anterior (6 días contra un mes entero siempre daba «bajaste 70%»).
- **Cierre estimado:** suma los fijos del mes y proyecta solo el gasto variable (un alquiler pagado
  el día 1 ya no lo infla). El presupuesto descuenta los fijos que faltan pagar.
- **Ajustes:** con el estilo de la app Ajustes de iOS, más recordatorios, bloqueo, apariencia,
  términos, soporte y versión. El presupuesto se escribe con puntos de miles.
- **Exportar** abre la hoja de compartir de iOS; **importar** abre el selector de archivos y pide
  confirmación si ya hay datos.
- **Fecha y medio de pago** usan los controles nativos (calendario y hoja de acciones de iOS).
- **Arreglado:** en la web, borrar el último dígito de «12.345» dejaba «12,34»; acá queda «1.234».
- **Montos:** el «$ 86.500» ya no queda partido entre dos renglones.
- **Fuera:** sin vista de escritorio ni atajos de teclado (la app es solo para iPhone).

## Antes de publicar

1. Tu email en `docs/privacidad.html`, `docs/terminos.html` y `docs/soporte.html`.
2. Publicá esas tres páginas y poné sus URL en `src/config.ts`.
3. `npm run check:release`.

La guía paso a paso está en [`docs/PUBLICAR_EN_APP_STORE.md`](docs/PUBLICAR_EN_APP_STORE.md) y el
detalle de seguridad y privacidad en [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md).
