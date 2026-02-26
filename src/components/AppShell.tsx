import SettingsIcon from '@mui/icons-material/Settings';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { useMemo, useState } from 'react';

import RedditReader from './RedditReader';
import SettingsDrawer from './SettingsDrawer';

type AppShellProps = {
  baseUrl: string;
  darkMode: boolean;
  onUpdateBaseUrl: (baseUrl: string) => void;
  onUpdateDarkMode: (enabled: boolean) => void;
};

const APP_BAR_HEIGHT = 64;

const normalizeBaseUrl = (url: string): string => {
  const trimmed = url.trim();

  if (!trimmed) {
    return '/proxy/https://old.reddit.com';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

const AppShell = ({ baseUrl, darkMode, onUpdateBaseUrl, onUpdateDarkMode }: AppShellProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const frameUrl = useMemo(() => normalizeBaseUrl(baseUrl), [baseUrl]);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography sx={{ flexGrow: 1 }} variant="h6">
            Reddit
          </Typography>
          <IconButton aria-label="open settings" color="inherit" onClick={() => setDrawerOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: `calc(100vh - ${APP_BAR_HEIGHT}px)`, mt: `${APP_BAR_HEIGHT}px` }}>
        <RedditReader src={frameUrl} />
      </Box>
      <SettingsDrawer
        baseUrl={baseUrl}
        darkMode={darkMode}
        onClose={() => setDrawerOpen(false)}
        onSaveBaseUrl={onUpdateBaseUrl}
        onToggleDarkMode={onUpdateDarkMode}
        open={drawerOpen}
      />
      {/* Bottom navigation placeholder for future expansion */}
    </Box>
  );
};

export default AppShell;
