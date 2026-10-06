import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

export interface LockCapability {
  /** El iPhone tiene al menos un código configurado (sin código no hay con qué bloquear) */
  available: boolean;
  /** Cómo se llama lo que se va a usar: "Face ID", "Touch ID" o "el código" */
  method: string;
}

const UNAVAILABLE: LockCapability = { available: false, method: 'el código' };

/** Qué puede usar este iPhone para bloquear la app. */
export async function getLockCapability(): Promise<LockCapability> {
  if (Platform.OS === 'web') return UNAVAILABLE;
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return UNAVAILABLE;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const method = !enrolled
      ? 'el código'
      : types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'Face ID'
        : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
          ? 'Touch ID'
          : 'el código';
    return { available: true, method };
  } catch {
    return UNAVAILABLE;
  }
}

export type AuthResult = 'ok' | 'canceled' | 'failed' | 'unavailable';

/**
 * Pide Face ID (o Touch ID). Si falla varias veces, iOS ofrece el código del iPhone: así nadie
 * queda afuera de sus propios datos. Gastito nunca ve la cara ni la huella: iOS solo responde sí o no.
 */
export async function authenticate(promptMessage: string): Promise<AuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar código',
      disableDeviceFallback: false,
    });
    if (result.success) return 'ok';
    if (['user_cancel', 'system_cancel', 'app_cancel'].includes(result.error)) return 'canceled';
    if (['not_enrolled', 'not_available', 'passcode_not_set'].includes(result.error)) return 'unavailable';
    return 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Desenfoque nativo del selector de apps, como respaldo de la pantalla que tapa la app al salir
 * (la de iOS aparece apenas la app deja de estar activa, sin esperar a JavaScript).
 */
export async function setAppSwitcherShield(enabled: boolean): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    if (enabled) await ScreenCapture.enableAppSwitcherProtectionAsync(1);
    else await ScreenCapture.disableAppSwitcherProtectionAsync();
  } catch {
    // si no está disponible (por ejemplo, en una versión vieja de Expo Go), queda la pantalla propia
  }
}
