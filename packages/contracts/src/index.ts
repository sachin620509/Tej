export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiFailure = { success: false; message: string; code: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type CursorPage<T> = { items: T[]; nextCursor: string | null };
export type Visibility = "public" | "followers" | "private";
export type SocialLinks = Partial<Record<"instagram"|"facebook"|"youtube"|"telegram"|"x"|"linkedin"|"github"|"website"|"other", string>>;
export type VerificationStatus = "unverified"|"pending"|"verified"|"rejected"|"suspended";
export interface ProfileSocialLink { id:string; platform:"instagram"|"youtube"|"facebook"|"telegram"|"x"|"linkedin"|"github"|"website"|"custom"; label?:string; url:string; displayOrder:number; isVisible:boolean; }
export type FollowState = "none"|"pending"|"following"|"follow_back"|"blocked"|"self";
export interface PublicProfile { id: string; name: string; username: string; bio?: string; location?: string; profession?:string; organization?:string; accountType?:"personal"|"creator"|"business"; website?: string; profilePhoto?: string; coverPhoto?: string; verificationStatus?:VerificationStatus; verified: boolean; isPrivate: boolean; allowPhotoDiscovery: boolean; followersCount: number; followingCount: number; postsCount: number; reelsCount?:number; socialLinks?: SocialLinks; links?:ProfileSocialLink[]; relationship?: FollowState; canViewPosts?: boolean; }
export interface AuthUser extends PublicProfile { email: string; emailVerified: boolean; role: "USER"|"SUPPORT"|"MODERATOR"|"ADMIN"|"SUPER_ADMIN"; mfaVerified?: boolean; }
export interface AuthPayload { user: AuthUser; accessToken: string; }
export interface MediaAsset { publicId: string; secureUrl: string; resourceType: "image"|"video"; width?: number; height?: number; duration?: number; }
export interface PostDto { id: string; author: PublicProfile; caption: string; media: MediaAsset[]; hashtags: string[]; visibility: Visibility; likesCount: number; commentsCount: number; isLiked?: boolean; isSaved?: boolean; createdAt: string; }
export interface DiscoveryCandidate { profile: PublicProfile; similarity: number; }
export interface CommentDto { id:string; postId:string; author:PublicProfile; body:string; parentId?:string; repliesCount:number; createdAt:string; }
export interface NotificationDto { id:string; type:"like"|"comment"|"reply"|"mention"|"follow"|"follow_request"|"message"|"message_request"|"final_note"|"admin"; actor?:PublicProfile; postId?:string; commentId?:string; readAt?:string; createdAt:string; }
export interface ConversationDto { id:string; type:"direct"|"group"; name?:string; members:PublicProfile[]; lastMessageAt?:string; lastMessage?:MessageDto; unreadCount?:number; }
export interface MessageAttachmentDto { id?:string; type:"image"|"video"|"voice"|"file"; secureUrl:string; mimeType:string; originalName?:string; sizeBytes:number; width?:number; height?:number; durationMs?:number; }
export interface MessageDto { id:string; clientMessageId?:string; conversationId:string; sender:PublicProfile; type:"text"|"image"|"video"|"voice"|"file"|"system"; text?:string; media?:MediaAsset; attachment?:MessageAttachmentDto; replyTo?:string; readBy:string[]; reactions?:Array<{emoji:string;userId:string}>; editedAt?:string; deletedForEveryoneAt?:string; createdAt:string; }
export interface CallDto { id:string; caller:PublicProfile; callee:PublicProfile; kind:"audio"|"video"; status:"initiating"|"ringing"|"accepted"|"active"|"rejected"|"declined"|"missed"|"busy"|"ended"|"failed"; startedAt:string; ringExpiresAt?:string; answeredAt?:string; endedAt?:string; endedReason?:"completed"|"declined"|"missed"|"busy"|"cancelled"|"network_failure"|"blocked"|"failed"; durationSeconds?:number; }
export interface IceConfig { iceServers: Array<{urls:string|string[];username?:string;credential?:string}>;ringTimeoutSeconds?:number;groupCalls?:{supported:boolean;architecture:string};recording?:boolean }
export interface ReelDto { id:string; author:PublicProfile; caption:string; video:MediaAsset; thumbnailUrl?:string; location?:string; hashtags:string[]; visibility:Visibility; commentsEnabled:boolean; processingStatus:"uploading"|"processing"|"ready"|"failed"; likesCount:number; commentsCount:number; savesCount:number; sharesCount:number; viewsCount:number; watchTimeMs?:number; isLiked?:boolean; isSaved?:boolean; createdAt:string; }
export type StoryType = "image"|"video"|"text";
export type StoryVisibility = "everyone"|"followers"|"close_friends";
export interface StoryMediaDto { storagePath:string; secureUrl:string; thumbnailPath?:string; mediaType:"image"|"video"; mimeType:string; width?:number; height?:number; durationMs?:number; sizeBytes:number; }
export interface StoryDto { id:string; author:PublicProfile; type:StoryType; textContent?:string; backgroundStyle?:"sunset"|"forest"|"ocean"|"midnight"|"paper"; textAlignment:"left"|"center"|"right"; fontStyle:"sans"|"serif"|"display"; visibility:StoryVisibility; repliesEnabled:boolean; reactionsEnabled:boolean; expiresAt:string; viewsCount:number; reactionsCount:number; isViewed?:boolean; media?:StoryMediaDto; createdAt:string; }
export const DISCOVERY_DISCLAIMER = "Photo discovery only works for InstaFrame members who have voluntarily enabled profile discovery.";
export type SearchType="all"|"people"|"posts"|"reels"|"hashtags"|"creators"|"businesses";
export interface InterestDto{id:string;key:string;name:string;selected:boolean}
export interface UnifiedSearchDto{users:PublicProfile[];posts:PostDto[];reels:ReelDto[];hashtags:Array<{name:string;count:number}>;creators:PublicProfile[];businesses:Array<PublicProfile&{businessName?:string;businessCategory?:string}>;suggestions:string[];nextCursor:string|null}
export type GroupType='private_group'|'public_group'|'announcement_channel';
export type GroupRole='owner'|'admin'|'moderator'|'member';
export interface GroupPermissionsDto{sendMessages:'all'|'moderators'|'admins';sendMedia:'all'|'moderators'|'admins';inviteMembers:'all'|'moderators'|'admins';editInfo:'moderators'|'admins';pinMessages:'moderators'|'admins';mentionEveryone:'moderators'|'admins';reactionsEnabled:boolean}
export interface GroupDto{id:string;conversationId:string;type:GroupType;name:string;description?:string;avatarUrl?:string;visibility:'private'|'public';joinMode:'invite_only'|'request_to_join'|'open';category?:string;memberCount:number;permissions:GroupPermissionsDto;role?:GroupRole;status?:'active'|'pending'|'banned'|'left';createdAt:string}
export type AIPurpose='caption'|'hashtags'|'bio'|'translate'|'alt_text'|'summary'|'language_detection'|'writing_help'|'creator_assistant'|'moderation_support';export type AISurface='post_draft'|'reel_draft'|'story_draft'|'profile_bio'|'creator_description'|'business_description'|'accessibility_editor'|'moderation_review';export interface AIAssistResult{suggestions:string[];detectedLanguage?:string;provider:string;disclaimer:string;warnings?:string[]}
