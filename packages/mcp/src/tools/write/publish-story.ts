import type { PublishStoryInput } from '../../schemas.js';

export async function publishStory(input: PublishStoryInput) {
  return {
    id: `mock-story-${Date.now()}`,
    teamId: input.teamId,
    authorId: 'mock-user-1',
    authorName: '测试用户',
    content: input.content,
    images: input.images ?? [],
    createdAt: new Date().toISOString(),
  };
}
