import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IntroSplash } from '@/components/brand/IntroSplash';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { LoadError } from '@/components/feedback/LoadError';
import { ToastProvider, useToast } from '@/components/feedback/ToastProvider';
import { HomeScreen } from '@/screens/HomeScreen';
import { clearExports } from '@/services/backup';
import { AppStateProvider, useAppDispatch, useAppState, useRetryLoad } from '@/state/AppStateProvider';
import { PreferencesProvider, usePreferences } from '@/state/PreferencesProvider';
import { SheetProvider } from '@/state/SheetProvider';
import { asyncStorageRepository } from '@/storage/asyncStorageRepository';
import { asyncStoragePreferences } from '@/storage/preferencesRepository';
import { fontAssets, makeStyles, ThemeProvider, useTheme } from '@/theme';

// la pantalla de carga nativa queda hasta que estén las fuentes, las preferencias y los datos
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // los archivos de exportaciones anteriores tienen todos tus datos: no se dejan en la caché
  useEffect(clearExports, []);

  return (
    <SafeAreaProvider>
      <PreferencesProvider repository={asyncStoragePreferences}>
        <ThemedApp>
          <ErrorBoundary>
            <ToastProvider>
              <DataProvider>
                <SheetProvider>
                  <Root fontsReady={fontsLoaded || fontError != null} />
                </SheetProvider>
              </DataProvider>
            </ToastProvider>
          </ErrorBoundary>
        </ThemedApp>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp({ children }: { children: ReactNode }) {
  const { prefs } = usePreferences();
  return (
    <ThemeProvider appearance={prefs.appearance}>
      <ThemedRoot>{children}</ThemedRoot>
    </ThemeProvider>
  );
}

function ThemedRoot({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <GestureHandlerRootView style={styles.root}>{children}</GestureHandlerRootView>;
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
  const { ready: prefsReady } = usePreferences();
  const { scheme } = useTheme();
  const dispatch = useAppDispatch();
  const retry = useRetryLoad();
  const toast = useToast();
  const settled = fontsReady && prefsReady && status !== 'loading';

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync();
  }, [settled]);

  useEffect(() => {
    if (issue !== 'recovered') return;
    toast('Tus datos guardados estaban dañados y no se pudieron abrir. Si tenés un backup, importalo desde Ajustes.');
    dispatch({ type: 'issueSeen' });
  }, [issue, toast, dispatch]);

  if (!settled) return null;
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {status === 'error' ? (
        <LoadError onRetry={retry} />
      ) : (
        <>
          <HomeScreen />
          <IntroSplash />
        </>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.canvas },
}));
