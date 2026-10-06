# Gastito para iPhone

Versión nativa de **Gastito** (React Native + Expo SDK 57), idéntica a la web: mismas pantallas,
colores, tipografía, textos y el mismo formato de datos.

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

En la primera pantalla tocá **"Ver un mes de ejemplo"** para cargar datos.

> En un iPhone físico con Expo Go hay que iniciar sesión con la misma cuenta de Expo en la terminal
> (`npx expo login`) y en la app. En el simulador no hace falta.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run lint` | ESLint con la configuración de Expo |
| `npm test` | Tests de la lógica de negocio (Jest) |
| `npm run format` | Formatea `src/` con Prettier |
| `npm run doctor` | Revisa versiones y configuración (expo-doctor) |
| `npm run build:ios` | Compila para la App Store con EAS |
| `npm run submit:ios` | Sube la última compilación a App Store Connect |

## Estructura

```
src/
  App.tsx        raíz: providers, fuentes y pantalla de carga
  config.ts      clave de guardado y URL de la política de privacidad
  domain/        reglas de negocio puras (sin React): tipos, categorías, cálculos,
                 geometría de la dona, validación de backups, CSV, datos de ejemplo
  lib/           utilidades: fechas, montos, campo de monto, texto, ids
  storage/       dónde se guardan los datos (interfaz + AsyncStorage)
  services/      exportar e importar archivos (hoja de compartir y selector de iOS)
  state/         estado global (reducer + context), guardado automático, hojas y acciones
  theme/         colores, fuentes y medidas (los tokens CSS de la web)
  components/    piezas reutilizables: botones, campos, íconos, hoja inferior, avisos,
                 encabezado, barra de abajo, apertura animada
  features/      cada sección: summary (Resumen), movements (Movimientos), fixed (Fijos),
                 expense (hoja de gasto), settings (Ajustes)
  screens/       HomeScreen, que arma todo
assets/          ícono 1024×1024 sin transparencia, ícono de Android y fuentes
docs/            guía para publicar en la App Store y política de privacidad
```

Las dependencias van en un solo sentido: `features` → `state` → `domain` → `lib`. El dominio no
conoce React ni el almacenamiento, así que se testea solo y se reutiliza tal cual si mañana hay un
backend.

## Decisiones

- **Sin backend.** Los datos quedan en el teléfono (AsyncStorage, el equivalente a `localStorage`).
  Sin cuentas no hay que implementar el borrado de cuenta que exige Apple y la ficha de privacidad es
  "No se recopilan datos". Para pasar a una base de datos se escribe otra implementación de
  `DataRepository` (`src/storage`) y el resto no cambia.
- **Backups compatibles con la web.** Misma clave (`gastito.v1`) y mismo JSON: un backup exportado
  desde la web se importa en la app y al revés. Todo lo importado pasa por `sanitizeData`.
- **Una sola pantalla con tres secciones**, como la web; no hace falta un router. Si la app crece
  (pantallas con navegación real, links profundos), el paso natural es Expo Router.
- **Compatible con Expo Go.** Todas las librerías nativas que usa vienen incluidas en Expo Go, así que
  para desarrollar no hace falta compilar nada.
- **Lista para Xcode 27.** `expo-build-properties` activa el ciclo de vida por escenas que exige el
  SDK de iOS 27 (sin eso, una app SDK 57 compilada con Xcode 27 abre en negro).

## Diferencias con la web (a propósito)

- **Ajustes:** link a la política de privacidad (Apple lo exige dentro de la app) y el texto "Tus
  datos viven en este navegador" ahora dice "en esta app".
- **Exportar** abre la hoja de compartir de iOS (Guardar en Archivos, AirDrop, Mail…); **importar**
  abre el selector de archivos.
- **Fecha y medio de pago** usan los controles nativos (calendario y hoja de acciones de iOS).
- **Arreglado:** en la web, borrar el último dígito de "12.345" dejaba "12,34"; acá queda "1.234".
- **Montos:** el "$ 86.500" ya no queda partido entre dos renglones.
- **Fuera:** sin vista de escritorio ni atajos de teclado (la app es solo para iPhone).
- **Accesibilidad:** respeta "Reducir movimiento" y el tamaño de letra de Accesibilidad, con un tope
  para que no se rompa el diseño.

## Antes de publicar

1. `app.json` → `ios.bundleIdentifier` (y `android.package`): tiene que ser único en Apple, por
   ejemplo `com.tuapellido.gastito`. No se puede cambiar después de la primera subida.
2. `src/config.ts` → `PRIVACY_POLICY_URL`: la URL donde publiques `docs/privacidad.html`.

La guía paso a paso está en [`docs/PUBLICAR_EN_APP_STORE.md`](docs/PUBLICAR_EN_APP_STORE.md).
