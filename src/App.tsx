import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IntroSplash } from '@/components/brand/IntroSplash';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { HomeScreen } from '@/screens/HomeScreen';
import { AppStateProvider, useAppState } from '@/state/AppStateProvider';
import { SheetProvider } from '@/state/SheetProvider';
import { asyncStorageRepository } from '@/storage/asyncStorageRepository';
import { colors, fontAssets } from '@/theme';

// la pantalla de carga nativa queda hasta que estén las fuentes y los datos
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AppStateProvider repository={asyncStorageRepository}>
            <ToastProvider>
              <SheetProvider>
                <Root fontsReady={fontsLoaded || fontError != null} />
              </SheetProvider>
            </ToastProvider>
          </AppStateProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useAppState();
  const ready = fontsReady && status === 'ready';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <>
      <StatusBar style="dark" />
      <HomeScreen />
      <IntroSplash />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
});
