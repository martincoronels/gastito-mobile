# Publicar Gastito en la App Store

Guía para la primera subida con **EAS**: los servidores de Expo compilan y firman la app, y la Mac
solo hace falta para probar en el simulador. Requisitos de Apple revisados en octubre de 2026.

## 0. Antes de empezar

- [ ] **Apple Developer Program** (USD 99 por año), en <https://developer.apple.com/programs/>. La
      inscripción como persona puede tardar uno o dos días en aprobarse.
- [ ] **Cuenta de Expo** (gratis), en <https://expo.dev/signup>.
- [ ] **Bundle ID definitivo** en `app.json` → `ios.bundleIdentifier` (hoy `com.martin.gastito`). No
      se puede cambiar después de la primera subida.
- [ ] **Tu email de contacto** en las tres páginas de `docs/` (`privacidad.html`, `terminos.html` y
      `soporte.html`): reemplazá `tu-email@ejemplo.com`.
- [ ] **Publicar las tres páginas** en tu sitio. En Cloudflare Pages alcanza con copiarlas al
      proyecto de la web: quedan en `https://tu-sitio.pages.dev/privacidad`, `/terminos` y
      `/soporte`. Poné esas URL en `src/config.ts`. Si podés, usá un dominio sin «beta» (la pauta 2.2
      rechaza apps que parecen de prueba).
- [ ] `npm run check:release` sin errores (revisa todo lo anterior y más: ícono, permisos, cifrado,
      manifiesto de privacidad, restos de depuración).

## 1. Probar todo

`npm run verify` corre los tipos, el lint y los ~90 tests (incluidos flujos completos de la app).
Después, `npx expo start` y `i` para el simulador. Lista de control:

- [ ] Anotar, editar y borrar un gasto (también con categoría propia). Deslizar una fila: a la
      izquierda «Eliminar», a la derecha «Otra vez». Probar «Deshacer» en el aviso.
- [ ] Gasto que «se repite todos los meses» → aparece en Fijos; pausarlo, borrarlo, deshacer.
- [ ] Aviso de fijos sin registrar → «Registrar».
- [ ] Presupuesto: al cruzar el 80% y el 100% aparece el aviso.
- [ ] Deslizar sobre la dona cambia de mes.
- [ ] Ajustes → Apariencia: Clara, Oscura y Automática (y el modo oscuro del sistema).
- [ ] Ajustes → Recordatorios: el permiso se pide recién al activar uno.
- [ ] Ajustes → Bloquear con Face ID: activarlo, salir de la app y volver.
- [ ] Exportar backup y CSV («Guardar en Archivos») e importar el backup.
- [ ] Links: en Safari del simulador, abrir `gastito://anotar?monto=1500&categoria=super`.
- [ ] Cerrar la app del todo y volver a abrirla: los datos siguen.
- [ ] Privacidad, Términos y Soporte abren sus páginas.
- [ ] Con VoiceOver (Cmd+F5 en el simulador): recorrer las pestañas y anotar un gasto.

> **Expo Go tiene límites**: Face ID puede pedir el código en su lugar, y Liquid Glass depende de cómo
> esté compilado Expo Go. La prueba que cuenta es la de la compilación real (paso 5, TestFlight).

Recomendado: probar la compilación de producción en el simulador, sin Expo Go:

```bash
npx eas-cli@latest build --platform ios --profile preview
```

## 2. Configurar EAS

```bash
npm install -g eas-cli      # o usá npx eas-cli@latest en cada comando
eas login
eas init                    # crea el proyecto en expo.dev y guarda su id en app.json
```

`eas.json` ya está listo: el perfil `preview` compila para el simulador y `production` para la App
Store, con el número de build que sube solo.

## 3. Compilar para la App Store

```bash
eas build --platform ios --profile production
```

La primera vez te pide iniciar sesión con tu Apple ID y ofrece manejar las credenciales: decile que
sí. EAS crea el certificado de distribución y el perfil de aprovisionamiento, registra el Bundle ID y
activa las capacidades que usa la app.

- Si pregunta por **Push Notifications** (una clave para notificaciones push): respondé **que no**.
  Los recordatorios de Gastito son locales y no necesitan servidor ni clave.
- Compila en la nube con Xcode 26, que cumple el requisito vigente de Apple (apps compiladas con el
  SDK de iOS 26 o posterior). Con ese SDK, los controles del sistema y la barra de Gastito usan
  **Liquid Glass** en iOS 26.
- **Alternativa local** con tu Mac y Xcode 27: `eas build --platform ios --profile production --local`,
  o `npx expo prebuild --platform ios` y Product → Archive en Xcode. El proyecto ya trae el ciclo de
  vida por escenas que pide el SDK de iOS 27.

## 4. Subir a App Store Connect

```bash
eas submit --platform ios --latest
```

Si la app todavía no existe en App Store Connect, `eas submit` la crea (pide nombre y SKU). Si
«Gastito» ya está usado en la App Store, probá una variante como «Gastito: gastos del mes». En el
iPhone el nombre debajo del ícono sigue siendo el de `app.json`.

Apple procesa la compilación entre 5 y 30 minutos y te avisa por mail.

## 5. TestFlight (muy recomendado)

En App Store Connect → TestFlight, agregate como tester interno e instalá la app desde la app
TestFlight en tu iPhone. Es exactamente la versión que va a ver la revisión de Apple. Probá ahí Face
ID, los recordatorios (por ejemplo, un fijo que venza mañana), los avisos que salen de la Dynamic
Island, el modo oscuro, el ícono oscuro y tintado de la pantalla de inicio, y Liquid Glass en iOS 26.

## 6. Completar la ficha

En App Store Connect, dentro de la app:

**Información de la app**
- Categoría principal: Finanzas (secundaria opcional: Productividad).
- **Clasificación por edades**: respondé el cuestionario (desde 2025 tiene preguntas nuevas). Sin
  contenido sensible, sin chat ni contenido generado por otros usuarios: queda en 4+.
- **Estado de comerciante (Unión Europea)**: si la vas a ofrecer en la UE, Apple pide declararlo. Si
  publicás como persona y la app es gratis y sin fines comerciales, podés declarar que no sos
  comerciante; si declarás que sí, Apple muestra tu dirección y teléfono en la ficha. Si preferís
  evitarlo, desmarcá los países de la UE en Precio y disponibilidad.

**Privacidad de la app**
- URL de la política de privacidad: la de `src/config.ts`.
- Prácticas de datos: **«No, no recopilamos datos de esta app»**. Es cierto: no hay analíticas ni
  servidor, los recordatorios son locales y Face ID lo resuelve iOS.

**Accesibilidad** (etiquetas opcionales; declarar solo lo que se cumple)
- Se pueden declarar: **Interfaz oscura**, **Movimiento reducido** y **Contraste suficiente** (con
  «Aumentar contraste» todo el texto supera 4,5:1).
- **VoiceOver**: todo tiene etiquetas y las acciones de deslizar están disponibles, pero declaralo
  recién después de anotar, editar y borrar un gasto con VoiceOver en tu iPhone.
- **Texto más grande**: no declararlo. La app respeta el tamaño de letra hasta 140% (para que el
  diseño no se rompa) y la etiqueta pide al menos 200%.

**Precio y disponibilidad**: gratis, en los países que quieras.

**Versión 1.0**
- Capturas: el tamaño de 6,9" (1320 × 2868). Sacalas del simulador **iPhone 17 Pro Max**, desde
  Device Hub o con `xcrun simctl io booted screenshot captura.png`. Entre 1 y 10. Sugeridas: Resumen
  con la dona, Movimientos, Fijos, el formulario de anotar, Ajustes y una en modo oscuro. No hacen
  falta capturas de iPad: la app es solo para iPhone.
- Subtítulo (máximo 30 caracteres): `Tus gastos, mes a mes`.
- Palabras clave (máximo 100): `gastos,presupuesto,finanzas,ahorro,plata,dinero,cuentas,fijos,suscripciones,mensual`.
- URL de soporte: la de `SUPPORT_URL` en `src/config.ts`.
- Descripción sugerida:

  > Gastito te muestra en qué se te va la plata cada mes. Anotás un gasto en segundos y la app arma
  > el resumen sola: cuánto gastaste, qué categoría pesa más, el promedio por día, el cierre
  > estimado y cómo vas contra el mes pasado a esta misma altura.
  >
  > • Gráfico por categoría: tocás una porción y ves el detalle. Deslizás y cambiás de mes.
  > • Gastos fijos (alquiler, suscripciones, servicios): te avisa el día que vencen y los registrás
  >   con un toque, desde la notificación.
  > • Presupuesto mensual: cuánto te queda por día, descontando los fijos que faltan pagar.
  > • Deslizá un gasto para borrarlo o anotarlo otra vez. Todo se puede deshacer.
  > • Recordatorios opcionales: diario (solo si no anotaste nada) y resumen del mes.
  > • Bloqueo con Face ID, modo oscuro y atajos para el botón de Acción.
  > • Categorías propias, búsqueda, filtros, exportación a CSV y backups.
  >
  > Sin cuentas, sin publicidad y sin seguimiento. Tus datos quedan solo en tu iPhone.

- Compilación: elegí la que subiste en el paso 4.
- Copyright: `2026 Tu Nombre`.
- Información para la revisión: tus datos de contacto; «Se requiere inicio de sesión»: no. Notas
  sugeridas:

  > Gastito es un registro de gastos personales que funciona sin conexión y sin cuenta. Todos los
  > datos se guardan solo en el dispositivo; la app no tiene servidor. Para ver la app con datos, en
  > la primera pantalla tocar "Ver un mes de ejemplo". Las notificaciones (recordatorios locales) y el
  > bloqueo con Face ID son opcionales y se activan en Ajustes; el permiso se pide recién al
  > activarlos. Exportar e importar usan la hoja de compartir y el selector de archivos de iOS. La app
  > acepta links gastito:// para la app Atajos.

- Lanzamiento: «Manualmente» si querés decidir vos cuándo sale después de la aprobación.

## 7. Enviar a revisión

«Agregar para revisión» → «Enviar a App Review». Suele tardar entre 24 y 48 horas.

## Qué revisa Apple y cómo lo cubre este proyecto

| Pauta | Qué pide | Cómo está cubierto |
| --- | --- | --- |
| 1.6 Seguridad de datos | Proteger la información de las personas | Datos solo en el dispositivo, bloqueo opcional, validación de lo importado (ver `docs/SEGURIDAD.md`) |
| 2.1 Completitud | Nada roto ni a medio hacer | Tests de la app completa; probá los links legales antes de enviar |
| 2.2 Betas y demos | Nada de «test», «beta» o «demo» en la ficha | Para pruebas está TestFlight; `check:release` avisa si las URL dicen «beta» |
| 2.3 Metadatos | Capturas reales de la app | Sacalas del simulador |
| 2.5.1 APIs públicas | Solo APIs públicas de iOS | Todo con módulos oficiales de Expo |
| 4.2 Funcionalidad mínima | Que no sea una web empaquetada | Controles nativos, notificaciones, Face ID, gestos, hápticos, Liquid Glass |
| 4.5.4 Notificaciones | No obligatorias ni publicitarias | Opcionales, locales y pedidas recién al activarlas |
| 5.1.1 Privacidad | Política en la ficha y dentro de la app; permisos con explicación | Ajustes → Privacidad; texto de Face ID en español |
| 5.1.2 Uso de datos | Declarar lo que se recopila | No se recopila nada; manifiesto de privacidad incluido |
| 5.6.1 Calificaciones | Usar el cartel oficial | `SKStoreReviewController` (expo-store-review), con límites |
| Cifrado | Declarar el uso de cifrado | `usesNonExemptEncryption: false` en `app.json` |
| Manifiesto de privacidad | Declarar las APIs con «motivo requerido» | `ios.privacyManifests` en `app.json` |

## Si te la rechazan

Llega un mensaje en el Resolution Center que cita la pauta. Corregís, compilás de nuevo
(`eas build`) y la volvés a enviar. Si el problema es solo de la ficha (textos, capturas), no hace
falta compilar.

## Próximas versiones

1. Subí `version` en `app.json` (1.0.1, 1.1.0…). El número de build lo maneja EAS.
2. `npm run verify` y `npm run check:release`.
3. `eas build --platform ios --profile production` y `eas submit --platform ios --latest`.
4. En App Store Connect creás la nueva versión, elegís la compilación y la enviás.

Ideas para versiones siguientes (necesitan una compilación de desarrollo y probarse en un iPhone):
widgets de pantalla de inicio y de la pantalla bloqueada con `expo-widgets`, y acciones rápidas al
mantener presionado el ícono.
