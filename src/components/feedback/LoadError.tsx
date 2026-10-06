import { View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { fonts, makeStyles } from '@/theme';

/**
 * Si no se pudieron leer los datos guardados, la app no arranca vacía (el próximo guardado los
 * pisaría): muestra esto y deja reintentar.
 */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.root} accessibilityRole="alert">
      <Logo size={44} />
      <AppText style={styles.title}>No pudimos abrir tus datos</AppText>
      <AppText style={styles.text}>
        Siguen guardados en el teléfono, no se borró nada. Probá de nuevo; si sigue pasando, cerrá Gastito y volvé a
        abrirla.
      </AppText>
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
  title: { fontFamily: fonts.display, fontSize: 19, lineHeight: 27.5, marginTop: 8, textAlign: 'center' },
  text: { fontSize: 14.5, lineHeight: 21, color: c.ink2, textAlign: 'center', marginBottom: 8, maxWidth: 320 },
}));
