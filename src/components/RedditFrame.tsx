import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  LinearProgress,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

type RedditFrameProps = {
  src: string;
};

const FRAME_TIMEOUT_MS = 7000;

const RedditFrame = ({ src }: RedditFrameProps) => {
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimedOut(false);

    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, FRAME_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [src]);

  const fallbackHost = useMemo(() => {
    try {
      return new URL(src).host;
    } catch {
      return src;
    }
  }, [src]);

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {loading && (
        <LinearProgress
          sx={{
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 2
          }}
        />
      )}

      <Box
        component="iframe"
        onLoad={() => {
          setLoading(false);
          setTimedOut(false);
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        src={src}
        sx={{ border: 'none', height: '100%', overflow: 'auto', width: '100%' }}
        title="Old Reddit"
      />

      {timedOut && (
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'background.default',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            left: 0,
            p: 2,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 3
          }}
        >
          <Card sx={{ maxWidth: 520, width: '100%' }}>
            <CardContent>
              <Typography gutterBottom variant="h6">
                This site blocks embedding
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {fallbackHost} prevents being shown inside an iframe (via security headers). You can still
                continue in a browser tab.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Tip: on Android, opening the link and using “Add to Home screen” still gives you an app-like
                experience.
              </Alert>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button
                endIcon={<OpenInNewIcon />}
                href={src}
                rel="noopener noreferrer"
                target="_blank"
                variant="contained"
              >
                Open Reddit
              </Button>
            </CardActions>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default RedditFrame;
