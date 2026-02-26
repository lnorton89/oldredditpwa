import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import { configureView, defaultPostIcon as DefaultPostIcon, type RedditView } from '../views/viewConfig';

type RedditReaderProps = {
  src: string;
};

type HomePost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  comments: number;
  thumbnail: string | null;
  permalink: string;
};

type PostComment = {
  id: string;
  author: string;
  body: string;
  score: number;
};

type PostPayload = {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  author: string;
  score: number;
  permalink: string | null;
  comments: PostComment[];
};

type ApiResponse = {
  view: RedditView;
  payload: {
    posts?: HomePost[];
  } | PostPayload;
};

const sourceToTarget = (src: string) => src.replace(/^\/proxy\//, '');

const RedditReader = ({ src }: RedditReaderProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const target = useMemo(() => sourceToTarget(src), [src]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/reddit?target=${encodeURIComponent(target)}`);

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const json = (await response.json()) as ApiResponse;

        if (!cancelled) {
          setData(json);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load Reddit view');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [target]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error || !data) {
    return <Alert severity="error">{error ?? 'Unknown rendering error'}</Alert>;
  }

  const viewConfig = configureView(data.view);
  const ViewIcon = viewConfig.icon;

  if (data.view === 'post') {
    const post = data.payload as PostPayload;

    return (
      <Stack spacing={2} sx={{ p: 2 }}>
        <Card>
          <CardContent>
            <Stack alignItems="center" direction="row" spacing={1} sx={{ mb: 1 }}>
              <ViewIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">{viewConfig.title}</Typography>
            </Stack>
            <Typography gutterBottom variant="h6">
              {post.title}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Chip label={post.subreddit || 'r/unknown'} size="small" />
              <Chip icon={<ThumbUpAltOutlinedIcon />} label={post.score} size="small" variant="outlined" />
            </Stack>
            {post.body && <Typography color="text.secondary">{post.body}</Typography>}
          </CardContent>
          {post.permalink && (
            <CardActions>
              <IconButton component="a" href={post.permalink} target="_blank">
                <OpenInNewIcon />
              </IconButton>
            </CardActions>
          )}
        </Card>

        {post.comments.length === 0 && <Alert severity="info">{viewConfig.emptyMessage}</Alert>}

        {post.comments.map((comment) => (
          <Card key={comment.id} variant="outlined">
            <CardContent>
              <Stack alignItems="center" direction="row" spacing={1} sx={{ mb: 1 }}>
                <Avatar sx={{ height: 24, width: 24 }}>{comment.author.slice(0, 1).toUpperCase()}</Avatar>
                <Typography variant="subtitle2">u/{comment.author}</Typography>
                <Chip icon={<ThumbUpAltOutlinedIcon />} label={comment.score} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2">{comment.body}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  const posts = ((data.payload as { posts?: HomePost[] }).posts ?? []) as HomePost[];

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Card>
        <CardContent>
          <Stack alignItems="center" direction="row" spacing={1}>
            <ViewIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2">{viewConfig.title}</Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            {viewConfig.description}
          </Typography>
        </CardContent>
      </Card>

      {posts.length === 0 && <Alert severity="info">{viewConfig.emptyMessage}</Alert>}

      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent>
            <Stack direction="row" spacing={2}>
              <Avatar src={post.thumbnail ?? undefined} variant="rounded">
                <DefaultPostIcon fontSize="small" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{post.title}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip label={post.subreddit} size="small" />
                  <Chip icon={<ThumbUpAltOutlinedIcon />} label={post.score} size="small" variant="outlined" />
                  <Chip
                    icon={<ChatBubbleOutlineOutlinedIcon />}
                    label={post.comments}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                  Posted by u/{post.author}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
          <CardActions>
            <IconButton component="a" href={post.permalink} rel="noreferrer" target="_blank">
              <OpenInNewIcon />
            </IconButton>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
};

export default RedditReader;
