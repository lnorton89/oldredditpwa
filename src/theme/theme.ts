import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#FF4500'
      },
      secondary: {
        main: '#0DD3BB'
      },
      ...(mode === 'dark'
        ? {
            background: {
              default: '#1A1A1B',
              paper: '#272729'
            }
          }
        : {})
    }
  });
