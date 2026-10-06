# Publicar Gastito en la App Store

Guía para la primera subida con **EAS**: los servidores de Expo compilan y firman la app, y la Mac
solo hace falta para probar en el simulador. Requisitos de Apple revisados en octubre de 2026.

## 0. Antes de empezar

- [ ] **Apple Developer Program** (USD 99 por año), en <https://developer.apple.com/programs/>. La
      inscripción como persona puede tardar uno o dos días en aprobarse.
- [ ] **Cuenta de Expo** (gratis), en <https://expo.dev/signup>.
- [ ] **Bundle ID definitivo** en `app.json` → `ios.bundleIdentifier` (por ejemplo
      `com.tuapellido.gastito`). No se puede cambiar después de la primera subida.
- [ ] **Política de privacidad publicada** en una URL pública. `docs/privacidad.html` está lista
      (completá tu email). En Cloudflare Pages alcanza con copiarla al proyecto de la web; queda en
      `https://tu-sitio.pages.dev/privacidad`. Poné esa URL en `src/config.ts`.
- [ ] **URL de soporte**: puede ser la misma web o una página simple con tu email.

## 1. Probar todo en el simulador

`npx expo start` y después `i`. Lista de control:

- [ ] Anotar, editar y borrar un gasto (también con categoría propia).
- [ ] Gasto que "se repite todos los meses" → aparece en Fijos; pausarlo y borrarlo.
- [ ] Aviso de fijos sin registrar → "Registrar".
- [ ] Presupuesto, filtros por categoría y búsqueda.
- [ ] Exportar JSON y CSV ("Guardar en Archivos") e importar el JSON exportado.
- [ ] Cerrar la app del todo y volver a abrirla: los datos siguen.
- [ ] Ajustes → Política de privacidad abre la página.

Recomendado: probar la compilación de producción en el simulador, sin Expo Go:

```bash
npx eas-cli@latest build --platform ios --profile preview
```

Al terminar, la terminal ofrece instalarla en el simulador.

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
sí. EAS crea el certificado de distribución y el perfil de aprovisionamiento, y registra el Bundle ID.

- Compila en la nube con Xcode 26, que cumple el requisito vigente de Apple (desde el 28 de abril de
  2026, apps compiladas con el SDK de iOS 26 o posterior).
- Con el plan gratis las compilaciones esperan en una cola: tarda más, pero funciona igual.
- **Alternativa local** con tu Mac y Xcode 27: `eas build --platform ios --profile production --local`,
  o `npx expo prebuild --platform ios` y Product → Archive en Xcode. El proyecto ya trae activado el
  ciclo de vida por escenas que pide el SDK de iOS 27.

## 4. Subir a App Store Connect

```bash
eas submit --platform ios --latest
```

Si la app todavía no existe en App Store Connect, `eas submit` la crea (pide nombre y SKU). Si
"Gastito" ya está usado en la App Store, probá una variante como "Gastito: gastos del mes". En el
iPhone el nombre debajo del ícono sigue siendo el de `app.json`.

Apple procesa la compilación entre 5 y 30 minutos y te avisa por mail.

## 5. TestFlight (recomendado)

En App Store Connect → TestFlight, agregate como tester interno e instalá la app desde la app
TestFlight en tu iPhone. Es exactamente la versión que va a ver la revisión de Apple.

## 6. Completar la ficha

En App Store Connect, dentro de la app:

**Información de la app**
- Categoría principal: Finanzas (secundaria opcional: Productividad).
- Clasificación por edades: respondé el cuestionario. Sin contenido sensible queda en 4+.

**Privacidad de la app**
- URL de la política de privacidad.
- Prácticas de datos: "No, no recopilamos datos de esta app". Es cierto: la app no tiene analíticas
  ni servidor, y los datos quedan en el teléfono.

**Precio y disponibilidad**: gratis, en los países que quieras.

**Versión 1.0**
- Capturas: el tamaño de 6,9" (1320 × 2868). Sacalas del simulador **iPhone 17 Pro Max**, desde
  Device Hub o con `xcrun simctl io booted screenshot captura.png`. Entre 1 y 10. No hacen falta
  capturas de iPad: la app es solo para iPhone.
- Subtítulo (máximo 30 caracteres): `Tus gastos, mes a mes`.
- Palabras clave (máximo 100): `gastos,presupuesto,finanzas,ahorro,plata,dinero,cuentas,suscripciones,mensual,registro`.
- Descripción sugerida:

  > Gastito te muestra en qué se te va la plata cada mes. Anotás un gasto en segundos y la app arma
  > el resumen sola: cuánto gastaste, qué categoría pesa más, el promedio por día, el cierre
  > estimado y la comparación con el mes anterior.
  >
  > • Gráfico por categoría: tocás una porción y ves el detalle.
  > • Gastos fijos (alquiler, suscripciones, servicios): te avisa cuáles faltan registrar.
  > • Presupuesto mensual, con lo que te queda por día.
  > • Categorías propias, con emoji y color.
  > • Búsqueda y filtros.
  > • Exportá el mes a CSV para Excel o Google Sheets, y hacé backups.
  >
  > Sin cuentas y sin publicidad. Tus datos quedan solo en tu iPhone.

- Compilación: elegí la que subiste en el paso 4.
- Copyright: `2026 Tu Nombre`.
- Información para la revisión: tus datos de contacto; "Se requiere inicio de sesión": no. Notas
  sugeridas:

  > Gastito es un registro de gastos personales que funciona sin conexión y sin cuenta. Todos los
  > datos se guardan solo en el dispositivo. Para ver la app con datos, en la primera pantalla tocar
  > "Ver un mes de ejemplo". Exportar e importar usan la hoja de compartir y el selector de archivos
  > de iOS.

- Lanzamiento: "Manualmente" si querés decidir vos cuándo sale después de la aprobación.

## 7. Enviar a revisión

"Agregar para revisión" → "Enviar a App Review". Suele tardar entre 24 y 48 horas.

## Qué revisa Apple y cómo lo cubre este proyecto

| Pauta | Qué pide | Cómo está cubierto |
| --- | --- | --- |
| 2.1 Completitud | Nada roto ni a medio hacer | Probá el link de privacidad antes de enviar |
| 2.2 Betas y demos | Nada de "test", "beta" o "demo" en la ficha | Para pruebas está TestFlight; evitá la URL `gastito-beta` como soporte |
| 2.3 Metadatos | Capturas reales de la app | Sacalas del simulador |
| 4.2 Funcionalidad mínima | Que no sea una web empaquetada | Es una app nativa, con controles de iOS |
| 5.1.1 Privacidad | Política en la ficha y dentro de la app | Ajustes → Política de privacidad |
| Cifrado | Declarar el uso de cifrado | `usesNonExemptEncryption: false` en `app.json` |
| Manifiesto de privacidad | Declarar las APIs con "motivo requerido" | `ios.privacyManifests` en `app.json` |

## Si te la rechazan

Llega un mensaje en el Resolution Center que cita la pauta. Corregís, compilás de nuevo
(`eas build`) y la volvés a enviar. Si el problema es solo de la ficha (textos, capturas), no hace
falta compilar.

## Próximas versiones

1. Subí `version` en `app.json` (1.0.1, 1.1.0…). El número de build lo maneja EAS.
2. `eas build --platform ios --profile production` y `eas submit --platform ios --latest`.
3. En App Store Connect creás la nueva versión, elegís la compilación y la enviás.
