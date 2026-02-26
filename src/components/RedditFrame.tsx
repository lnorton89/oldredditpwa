import { Box, LinearProgress } from '@mui/material';
import { useEffect, useState } from 'react';

type RedditFrameProps = {
  src: string;
};

const RedditFrame = ({ src }: RedditFrameProps) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
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
            zIndex: 1
          }}
        />
      )}
      <Box
        component="iframe"
        onLoad={() => setLoading(false)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        src={src}
        sx={{ border: 'none', height: '100%', overflow: 'auto', width: '100%' }}
        title="Old Reddit"
      />
    </Box>
  );
};

export default RedditFrame;
