import { AppError } from '../middleware/error.js';
import { Block,ConversationMember,Group,GroupMember,Message } from '../models/index.js';
export type GroupRole='owner'|'admin'|'moderator'|'member';
const levels:Record<GroupRole,number>={member:0,moderator:1,admin:2,owner:3};
export const normalizeGroupName=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export async function groupContext(groupId:string,userId:string,minimum:GroupRole='member'){
 const group=await Group.findOne({_id:groupId,deletedAt:null});if(!group)throw new AppError(404,'GROUP_NOT_FOUND','Group not found');
 const member=await GroupMember.findOne({groupId,userId,status:'active'});if(!member)throw new AppError(403,'GROUP_MEMBERSHIP_REQUIRED','Active group membership is required');
 if(levels[member.role as GroupRole]<levels[minimum])throw new AppError(403,'GROUP_PERMISSION_DENIED','You do not have permission for this group action');
 return {group,member};
}
export function permits(role:GroupRole,rule:'all'|'moderators'|'admins'){return rule==='all'||rule==='moderators'&&levels[role]>=levels.moderator||rule==='admins'&&levels[role]>=levels.admin}
export async function assertGroupCanSend(conversationId:string,userId:string,media=false){
 const group=await Group.findOne({conversationId,deletedAt:null});if(!group)return;
 const member=await GroupMember.findOne({groupId:group._id,userId,status:'active'});if(!member)throw new AppError(403,'GROUP_MEMBERSHIP_REQUIRED','Active group membership is required');
 if(member.mutedUntil&&member.mutedUntil.getTime()>Date.now())throw new AppError(403,'GROUP_MEMBER_MUTED','You are temporarily muted in this group');
 const role=member.role as GroupRole,rule=media?group.permissions.sendMedia:group.permissions.sendMessages;
 if(group.type==='announcement_channel'&&levels[role]<levels.moderator)throw new AppError(403,'ANNOUNCEMENT_READ_ONLY','Only channel moderators can publish');
 if(!permits(role,rule))throw new AppError(403,'GROUP_SEND_RESTRICTED','Your role cannot send this content');
}
export async function addActiveGroupMember(groupId:string,userId:string,invitedBy?:string){
 const group=await Group.findById(groupId);if(!group)throw new AppError(404,'GROUP_NOT_FOUND','Group not found');
 if(await Block.exists({$or:[{blocker:userId,blocked:group.ownerId},{blocker:group.ownerId,blocked:userId}]}))throw new AppError(403,'INTERACTION_BLOCKED','Group membership is unavailable');
 const existing=await GroupMember.findOne({groupId,userId});if(existing?.status==='banned')throw new AppError(403,'GROUP_MEMBER_BANNED','This member is banned');
 const becameActive=!existing||existing.status!=='active';await GroupMember.updateOne({groupId,userId},{$set:{status:'active',role:existing?.role==='owner'?'owner':'member',joinedAt:new Date(),invitedBy}},{upsert:true});
 await ConversationMember.updateOne({conversationId:group.conversationId,userId},{$set:{deletedForUserAt:null},$setOnInsert:{joinedAt:new Date()}},{upsert:true});if(becameActive)await Group.updateOne({_id:groupId},{$inc:{memberCount:1}});return group;
}
export async function removeGroupMember(groupId:string,userId:string,status:'left'|'banned'='left'){
 const member=await GroupMember.findOne({groupId,userId});if(!member||member.status!== 'active')return;const group=await Group.findById(groupId);await GroupMember.updateOne({_id:member._id},{$set:{status}});if(group){await ConversationMember.updateOne({conversationId:group.conversationId,userId},{$set:{deletedForUserAt:new Date()}});await Group.updateOne({_id:groupId},{$inc:{memberCount:-1}})}
}
export async function assertGroupMessage(groupId:string,messageId:string){const group=await Group.findById(groupId);const message=group?await Message.findOne({_id:messageId,conversation:group.conversationId}):null;if(!message)throw new AppError(404,'MESSAGE_NOT_FOUND','Group message not found');return {group:group!,message}}
