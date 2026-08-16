export type { StoryDetailResponse, StoryV2 as Story } from "./story-contract";

export interface StoryDetailProps {
  storyId: string;
}

export type TFunction = (
  key: string,
  vars?: Record<string, string | number>,
) => string;
