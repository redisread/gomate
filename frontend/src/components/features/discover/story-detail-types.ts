export interface Story {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  viewCount: number;
  likeCount: number;
  createdAt: number;
  updatedAt: number;
  status: string;
  author: {
    id: string;
    name: string;
    image?: string;
  } | null;
  location: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface StoryDetailResponse {
  success: boolean;
  data: Story;
}

export interface StoryDetailProps {
  storyId: string;
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;
