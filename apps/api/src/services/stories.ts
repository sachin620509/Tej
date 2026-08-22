import { AppError } from '../middleware/error.js';
import { Block, Follow, Story, StoryPreference, User } from '../models/index.js';

type StoryAccessInput = { author: unknown; visibility: unknown; hiddenFrom?: unknown[]; expiresAt: unknown; deletedAt?: unknown; archivedAt?: unknown };

export async function canViewStory(viewerId: string, story: StoryAccessInput, allowOwnerArchive = false) {
  const authorId = String(story.author);
  const expiresAt = new Date(String(story.expiresAt));
  if (viewerId === authorId) return expiresAt.getTime() > Date.now() || Boolean(allowOwnerArchive && story.archivedAt);
  if (story.deletedAt || expiresAt.getTime() <= Date.now()) return false;
  if (story.hiddenFrom?.some((id) => String(id) === viewerId)) return false;
  if (await Block.exists({ $or: [{ blocker: viewerId, blocked: authorId }, { blocker: authorId, blocked: viewerId }] })) return false;
  const author = await User.findOne({ _id: authorId, status: 'active' }).select('isPrivate').lean();
  if (!author) return false;
  const follows = Boolean(await Follow.exists({ follower: viewerId, following: authorId, status: 'accepted' }));
  if (author.isPrivate && !follows) return false;
  if (story.visibility === 'followers' && !follows) return false;
  if (story.visibility === 'close_friends') {
    const preference = await StoryPreference.findOne({ userId: authorId }).select('closeFriends').lean();
    if (!preference?.closeFriends.some((id) => String(id) === viewerId)) return false;
  }
  return true;
}

export async function requireStory(viewerId: string, storyId: string, allowOwnerArchive = false) {
  const story = await Story.findById(storyId);
  if (!story || !(await canViewStory(viewerId, {
    author: story.author,
    visibility: story.visibility,
    hiddenFrom: story.hiddenFrom,
    expiresAt: story.expiresAt,
    deletedAt: story.deletedAt,
    archivedAt: story.archivedAt,
  }, allowOwnerArchive))) throw new AppError(404, 'STORY_NOT_FOUND', 'Story not found');
  return story;
}
