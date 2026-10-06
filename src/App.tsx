import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IntroSplash } from '@/components/brand/IntroSplash';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { LoadError } from '@/components/feedback/LoadError';
import { ToastProvider, useToast } from '@/components/feedback/ToastProvider';
import { HomeScreen } from '@/screens/HomeScreen';
import { clearExports } from '@/services/backup';
import { AppStateProvider, useAppDispatch, useAppState, useRetryLoad } from '@/state/AppStateProvider';
import { SheetProvider } from '@/state/SheetProvider';
import { asyncStorageRepository } from '@/storage/asyncStorageRepository';
import { colors, fontAssets } from '@/theme';

// la pantalla de carga nativa queda hasta que estén las fuentes y los datos
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // los archivos de exportaciones anteriores tienen todos tus datos: no se dejan en la caché
  useEffect(clearExports, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ToastProvider>
            <DataProvider>
              <SheetProvider>
                <Root fontsReady={fontsLoaded || fontError != null} />
              </SheetProvider>
            </DataProvider>
          </ToastProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  return (
    <AppStateProvider
      repository={asyncStorageRepository}
      onSaveError={() => toast('No se pudo guardar. Revisá que el iPhone tenga espacio libre.')}
    >
      {children}
    </AppStateProvider>
  );
}

function Root({ fontsReady }: { fontsReady: boolean }) {
  const { status, issue } = useAppState();
  const dispatch = useAppDispatch();
  const retry = useRetryLoad();
  const toast = useToast();
  const settled = fontsReady && status !== 'loading';

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync();
  }, [settled]);

  useEffect(() => {
    if (issue !== 'recovered') return;
    toast('Tus datos guardados estaban dañados y no se pudieron abrir. Si tenés un backup, importalo desde Ajustes.');
    dispatch({ type: 'issueSeen' });
  }, [issue, toast, dispatch]);

  if (!settled) return null;
  if (status === 'error') return <LoadError onRetry={retry} />;
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
