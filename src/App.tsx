import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useMemo } from 'react';

import AppShell from './components/AppShell';
import { useSettings } from './hooks/useSettings';
import { createAppTheme } from './theme/theme';

const App = () => {
  const [settings, updateSettings] = useSettings();

  const theme = useMemo(
    () => createAppTheme(settings.darkMode ? 'dark' : 'light'),
    [settings.darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route
            element={
              <AppShell
                baseUrl={settings.baseUrl}
                darkMode={settings.darkMode}
                onUpdateBaseUrl={(baseUrl) => updateSettings({ baseUrl })}
                onUpdateDarkMode={(darkMode) => updateSettings({ darkMode })}
              />
            }
            path="/"
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
