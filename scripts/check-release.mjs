#!/usr/bin/env node
/**
 * Revisión antes de subir una versión a la App Store: lo que suele terminar en un rechazo o en un
 * descuido (emails de ejemplo, URLs sin publicar, ícono con transparencia, permisos sin texto…).
 *
 *   npm run check:release
 *
 * Sale con error si hay algo que corregir. Las advertencias no frenan, pero conviene leerlas.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const errors = [];
const warnings = [];
const ok = [];

// ---- app.json -------------------------------------------------------------------------------
const { expo } = JSON.parse(read('app.json'));
const ios = expo.ios ?? {};

if (!/^\d+\.\d+\.\d+$/.test(expo.version ?? '')) errors.push(`app.json → version "${expo.version}" no es x.y.z`);
else ok.push(`Versión ${expo.version}`);

const bundleId = ios.bundleIdentifier ?? '';
if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(bundleId) || /example|ejemplo|tuapellido/i.test(bundleId)) {
  errors.push(`app.json → ios.bundleIdentifier "${bundleId}" no es válido o es de ejemplo`);
} else {
  ok.push(`Bundle ID ${bundleId} (no se puede cambiar después de la primera subida)`);
}

if (ios.config?.usesNonExemptEncryption !== false) {
  errors.push('app.json → ios.config.usesNonExemptEncryption tiene que ser false (la app no usa cifrado propio)');
} else ok.push('Cifrado declarado (ITSAppUsesNonExemptEncryption = NO)');

const manifest = ios.privacyManifests;
if (!manifest || manifest.NSPrivacyTracking !== false || !Array.isArray(manifest.NSPrivacyCollectedDataTypes)) {
  errors.push('app.json → falta ios.privacyManifests (con NSPrivacyTracking: false y los datos recopilados)');
} else ok.push('Manifiesto de privacidad: sin seguimiento ni datos recopilados');

const plugin = (name) => expo.plugins?.find((p) => (Array.isArray(p) ? p[0] : p) === name);
const auth = plugin('expo-local-authentication');
const faceId = Array.isArray(auth) ? auth[1]?.faceIDPermission : undefined;
if (!faceId || /allow|\$\(PRODUCT_NAME\)/i.test(faceId)) {
  errors.push(
    'app.json → expo-local-authentication necesita faceIDPermission en español (si no, iOS muestra un texto genérico en inglés)',
  );
} else ok.push('Texto del permiso de Face ID');

if (!expo.scheme) warnings.push('app.json → sin "scheme": los atajos gastito:// no van a funcionar');

// ---- íconos ---------------------------------------------------------------------------------
function pngInfo(path) {
  const buf = readFileSync(join(root, path));
  if (buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}
const icons = typeof ios.icon === 'object' ? ios.icon : { light: ios.icon ?? expo.icon };
for (const [variant, path] of Object.entries(icons)) {
  if (!path || !existsSync(join(root, path))) {
    errors.push(`Ícono ${variant}: no existe ${path}`);
    continue;
  }
  const info = pngInfo(path);
  if (!info || info.width !== 1024 || info.height !== 1024) {
    errors.push(`Ícono ${variant} (${path}): tiene que ser un PNG de 1024 × 1024`);
  } else if (variant !== 'dark' && (info.colorType === 4 || info.colorType === 6)) {
    // Apple rechaza el ícono principal con canal alfa
    errors.push(`Ícono ${variant} (${path}): no puede tener transparencia`);
  } else ok.push(`Ícono ${variant}: 1024 × 1024${variant === 'dark' ? '' : ', sin transparencia'}`);
}

// ---- páginas públicas -----------------------------------------------------------------------
const config = read('src/config.ts');
const url = (name) => new RegExp(`${name}\\s*=\\s*'([^']+)'`).exec(config)?.[1];
const pages = { PRIVACY_POLICY_URL: 'privacidad', TERMS_URL: 'terminos', SUPPORT_URL: 'soporte' };
for (const [name, page] of Object.entries(pages)) {
  const value = url(name);
  if (!value || !value.startsWith('https://') || /ejemplo|example/.test(value)) {
    errors.push(`src/config.ts → ${name} no es una URL https válida`);
    continue;
  }
  if (/beta|test|staging/i.test(value)) {
    warnings.push(
      `src/config.ts → ${name} (${value}) dice "beta/test": Apple puede leerlo como app de prueba (pauta 2.2). Mejor un dominio definitivo.`,
    );
  }
  if (!existsSync(join(root, `docs/${page}.html`))) errors.push(`Falta docs/${page}.html`);
}

for (const file of readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.html'))) {
  const html = read(`docs/${file}`);
  if (/tu-email@ejemplo\.com/.test(html))
    errors.push(`docs/${file}: reemplazá tu-email@ejemplo.com por tu email de contacto`);
}

// ---- código ---------------------------------------------------------------------------------
function walk(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(root, path)).isDirectory()) return name === '__tests__' ? [] : walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
const leftovers = walk('src').filter((file) => /console\.(log|debug)\(|debugger;/.test(read(file)));
if (leftovers.length) warnings.push(`Quedaron console.log/debugger en: ${leftovers.join(', ')}`);
else ok.push('Sin console.log ni debugger en el código');

// ---- URLs publicadas (si hay conexión) ------------------------------------------------------
async function checkOnline() {
  for (const name of Object.keys(pages)) {
    const value = url(name);
    if (!value?.startsWith('https://')) continue;
    try {
      const res = await fetch(value, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (res.ok) ok.push(`${value} responde`);
      else if (res.status === 401 || res.status === 403) {
        // puede ser un proxy o un firewall de la red, no necesariamente la página
        warnings.push(`${value} respondió ${res.status}: abrila en el navegador para confirmar que está publicada`);
      } else errors.push(`${value} responde ${res.status}: publicá la página antes de enviar la app`);
    } catch {
      warnings.push(`No se pudo verificar ${value} (sin conexión): abrila en el navegador antes de enviar`);
    }
  }
}

await checkOnline();

const print = (title, list, mark) =>
  list.length && console.log(`\n${title}\n${list.map((l) => `  ${mark} ${l}`).join('\n')}`);
print('Bien', ok, '✓');
print('Advertencias', warnings, '!');
print('Para corregir antes de publicar', errors, '✗');
console.log(errors.length ? `\n${errors.length} cosa(s) para corregir.` : '\nListo para compilar y subir.');
process.exit(errors.length ? 1 : 0);
