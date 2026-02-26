import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';

type SettingsDrawerProps = {
  baseUrl: string;
  darkMode: boolean;
  onClose: () => void;
  onSaveBaseUrl: (baseUrl: string) => void;
  onToggleDarkMode: (enabled: boolean) => void;
  open: boolean;
};

const SettingsDrawer = ({
  baseUrl,
  darkMode,
  onClose,
  onSaveBaseUrl,
  onToggleDarkMode,
  open
}: SettingsDrawerProps) => {
  const [draftBaseUrl, setDraftBaseUrl] = useState(baseUrl);

  useEffect(() => {
    setDraftBaseUrl(baseUrl);
  }, [baseUrl, open]);

  const saveBaseUrl = () => {
    const trimmed = draftBaseUrl.trim();
    onSaveBaseUrl(trimmed || 'https://old.reddit.com');
  };

  return (
    <Drawer anchor="right" onClose={onClose} open={open}>
      <Box sx={{ p: 3, width: 320 }}>
        <Stack spacing={2.5}>
          <Typography variant="h6">Settings</Typography>
          <Divider />
          <TextField
            fullWidth
            label="Base URL"
            onBlur={saveBaseUrl}
            onChange={(event) => setDraftBaseUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveBaseUrl();
              }
            }}
            value={draftBaseUrl}
          />
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(event) => onToggleDarkMode(event.target.checked)}
              />
            }
            label="Dark Mode"
          />
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default SettingsDrawer;
