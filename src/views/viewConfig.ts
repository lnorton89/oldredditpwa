import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export type RedditView = 'home' | 'post';

export type ViewConfig = {
  description: string;
  emptyMessage: string;
  icon: SvgIconComponent;
  title: string;
};

export const configureView = (view: RedditView): ViewConfig => {
  if (view === 'post') {
    return {
      title: 'Post view',
      description: 'Focused post details and top comments in a card-based layout.',
      emptyMessage: 'No comments available for this thread.',
      icon: ChatBubbleOutlineOutlinedIcon
    };
  }

  return {
    title: 'Home view',
    description: 'Uncluttered feed cards for subreddit browsing.',
    emptyMessage: 'No posts found for this listing.',
    icon: HomeOutlinedIcon
  };
};

export const defaultPostIcon = ArticleOutlinedIcon;
