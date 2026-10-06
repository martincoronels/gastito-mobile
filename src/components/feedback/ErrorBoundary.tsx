import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme';

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
    console.error('Gastito: error inesperado', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <AppText style={styles.title}>Algo salió mal</AppText>
        <AppText style={styles.text}>Tus datos siguen guardados en el teléfono. Probá de nuevo.</AppText>
        <Button label="Reintentar" onPress={() => this.setState({ error: null })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '600' },
  text: { fontSize: 14.5, lineHeight: 21, color: colors.ink2, textAlign: 'center', marginBottom: 8 },
});
