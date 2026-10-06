import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  /** Texto del botón que confirma */
  confirmLabel: string;
  /** Se muestra en rojo, como toda acción que borra algo en iOS */
  destructive?: boolean;
  cancelLabel?: string;
}

/** Pide confirmación con la alerta nativa de iOS. Resuelve true si se confirmó. */
export function confirm({
  title,
  message,
  confirmLabel,
  destructive = false,
  cancelLabel = 'Cancelar',
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm([title, message].filter(Boolean).join('\n\n')),
    );
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
