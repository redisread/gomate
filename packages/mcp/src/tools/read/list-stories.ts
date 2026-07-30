import type { ListStoriesInput } from '../../schemas.js';

export async function listStories(input: ListStoriesInput) {
  return {
    stories: [
      {
        id: 'mock-story-1',
        teamId: input.teamId ?? 'mock-team-1',
        authorId: 'mock-user-1',
        authorName: '测试用户',
        content: '这是一篇徒步故事',
        images: [],
        createdAt: new Date().toISOString(),
      },
    ],
    nextCursor: null,
    total: 1,
  };
}
