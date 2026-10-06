import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { makeStyles } from '@/theme';

interface State {
  error: Error | null;
}

/** Si algo falla al dibujar, se muestra un aviso con "Reintentar" en vez de una pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // solo queda en la consola del dispositivo: Gastito no manda reportes a ningún servidor
    console.error('Gastito: error inesperado', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.root} accessibilityRole="alert">
      <AppText style={styles.title}>Algo salió mal</AppText>
      <AppText style={styles.text}>Tus datos siguen guardados en el teléfono. Probá de nuevo.</AppText>
      <Button label="Reintentar" onPress={onRetry} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '600' },
  text: { fontSize: 14.5, lineHeight: 21, color: c.ink2, textAlign: 'center', marginBottom: 8 },
}));
