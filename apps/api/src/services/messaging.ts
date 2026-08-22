import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Block,Conversation,ConversationMember,Follow,Message,MessageAttachment,MessageReceipt,MessageRequest,User } from '../models/index.js';
import { AppError } from '../middleware/error.js';
import type { z } from 'zod';
import type { messageCreateSchema } from '../validators/message.js';
import { assertGroupCanSend } from './groups.js';
type MessageInput=z.infer<typeof messageCreateSchema>;
export const directKey=(a:unknown,b:unknown)=>[String(a),String(b)].sort().join(':');
export const directConversationId=(a:unknown,b:unknown)=>new Types.ObjectId(crypto.createHash('sha256').update(`direct:${directKey(a,b)}`).digest('hex').slice(0,24));
const deterministicMessageId=(sender:unknown,clientId:string)=>new Types.ObjectId(crypto.createHash('sha256').update(`message:${String(sender)}:${clientId}`).digest('hex').slice(0,24));
const deterministicRelationId=(kind:string,...parts:unknown[])=>new Types.ObjectId(crypto.createHash('sha256').update(`${kind}:${parts.map(String).join(':')}`).digest('hex').slice(0,24));
const ignoreDuplicate=async(operation:Promise<unknown>)=>{try{await operation}catch(error){if((error as {code?:number}).code!==11000)throw error}};

export async function assertConversationMember(conversationId:string,userId:string){
  const membership=await ConversationMember.findOne({conversationId,userId,deletedForUserAt:null});
  const conversation=membership?await Conversation.findById(conversationId):await Conversation.findOne({_id:conversationId,members:userId});
  if(!conversation)throw new AppError(404,'CONVERSATION_NOT_FOUND','Conversation not found');
  return conversation;
}
export async function messagePermission(senderId:string,targetId:string){
  const target=await User.findOne({_id:targetId,status:'active'}).select('privacy').lean();
  if(!target)throw new AppError(404,'MEMBER_NOT_FOUND','Member not found');
  if(await Block.exists({$or:[{blocker:senderId,blocked:targetId},{blocker:targetId,blocked:senderId}]}))throw new AppError(403,'INTERACTION_BLOCKED','Messaging is unavailable between blocked accounts');
  const policy=String(target.privacy?.whoCanMessage??'followers');
  const [senderFollows,targetFollows]=await Promise.all([Follow.exists({follower:senderId,following:targetId,status:'accepted'}),Follow.exists({follower:targetId,following:senderId,status:'accepted'})]);
  const immediate=policy==='everyone'||policy==='followers'&&Boolean(senderFollows)||policy==='following'&&Boolean(targetFollows)||policy==='mutuals'&&Boolean(senderFollows)&&Boolean(targetFollows);
  if(immediate)return 'accepted' as const;
  if(policy==='none')throw new AppError(403,'MESSAGES_DISABLED','This member is not accepting messages');
  return 'pending' as const;
}
export async function getOrCreateDirectConversation(senderId:string,targetId:string,allowRequest=false){
  if(senderId===targetId)throw new AppError(400,'INVALID_MEMBER','You cannot message yourself');
  const status=await messagePermission(senderId,targetId);
  if(status==='pending'&&!allowRequest)throw new AppError(403,'MESSAGE_NOT_ALLOWED','This member accepts new conversations through message requests');
  const key=directKey(senderId,targetId),id=directConversationId(senderId,targetId);
  let conversation=await Conversation.findOne({directKey:key});
  if(!conversation){try{conversation=await Conversation.create({_id:id,type:'direct',members:[senderId,targetId],directKey:key,requestStatus:status==='pending'?'pending':'accepted'});}catch(error){if((error as {code?:number}).code!==11000)throw error;conversation=await Conversation.findOne({directKey:key});}}
  if(!conversation)throw new AppError(409,'CONVERSATION_CONFLICT','Could not create conversation');
  await Promise.all([senderId,targetId].map(userId=>ignoreDuplicate(ConversationMember.updateOne({_id:deterministicRelationId('conversation-member',conversation!._id,userId)},{$setOnInsert:{conversationId:conversation!._id,userId,joinedAt:new Date()}},{upsert:true}))));
  if(status==='pending')await ignoreDuplicate(MessageRequest.updateOne({_id:deterministicRelationId('message-request',conversation._id)},{$setOnInsert:{requester:senderId,target:targetId,conversationId:conversation._id,status:'pending'}},{upsert:true}));
  return conversation;
}
export async function sendMessage(userId:string,conversationId:string,input:MessageInput){
  const conversation=await assertConversationMember(conversationId,userId);
  if(conversation.type==='group')await assertGroupCanSend(conversationId,userId,input.type!=='text');
  let pendingRequest=false;
  if(conversation.type==='direct'){
    const other=conversation.members.find(id=>String(id)!==userId);
    if(!other)throw new AppError(409,'INVALID_CONVERSATION','Direct conversation is invalid');
    if(await Block.exists({$or:[{blocker:userId,blocked:other},{blocker:other,blocked:userId}]}))throw new AppError(403,'INTERACTION_BLOCKED','Messaging is unavailable between blocked accounts');
    if(conversation.requestStatus==='rejected'||conversation.requestStatus==='blocked')throw new AppError(403,'MESSAGE_REQUEST_CLOSED','This message request is closed');
    if(conversation.requestStatus==='pending'){
      const request=await MessageRequest.findOne({conversationId:conversation._id,status:'pending'});
      if(!request||String(request.requester)!==userId)throw new AppError(403,'MESSAGE_REQUEST_PENDING','Accept the message request before replying');
      pendingRequest=true;
    }
  }
  const clientMessageId=input.clientMessageId??crypto.randomUUID();
  const existing=await Message.findOne({sender:userId,clientMessageId}).populate('sender','name username profilePhoto verified').populate('attachment').lean();
  if(existing)return existing;
  if(pendingRequest&&await Message.exists({conversation:conversation._id,sender:userId,deletedForEveryoneAt:null}))throw new AppError(429,'MESSAGE_REQUEST_LIMIT','Wait for this member to accept your request');
  if(input.replyTo&&!await Message.exists({_id:input.replyTo,conversation:conversation._id,deletedForEveryoneAt:null}))throw new AppError(400,'INVALID_REPLY','Reply target is invalid');
  let attachment;
  if(input.attachment){
    if(!input.attachment.publicId.startsWith(`instaframe/${userId}/messages/${conversation._id}/`))throw new AppError(400,'INVALID_ATTACHMENT_OWNER','Attachment does not belong to this conversation');
    attachment=await MessageAttachment.create({owner:userId,conversationId:conversation._id,storagePath:input.attachment.publicId,secureUrl:input.attachment.secureUrl,type:input.attachment.resourceType,mimeType:input.attachment.mimeType,originalName:input.attachment.originalName,sizeBytes:input.attachment.sizeBytes,width:input.attachment.width,height:input.attachment.height,durationMs:input.attachment.durationMs});
  }
  let message;
  try{message=await Message.create({_id:deterministicMessageId(userId,clientMessageId),conversation:conversation._id,sender:userId,clientMessageId,type:input.type,text:input.text,attachment:attachment?._id,replyTo:input.replyTo,readBy:[userId]});}
  catch(error){if((error as {code?:number}).code===11000){const duplicate=await Message.findOne({sender:userId,clientMessageId}).populate('sender','name username profilePhoto verified').populate('attachment').lean();if(duplicate)return duplicate;}throw error;}
  await Promise.all([Conversation.updateOne({_id:conversation._id},{$set:{lastMessage:message._id,lastMessageAt:message.createdAt}}),ConversationMember.updateOne({conversationId:conversation._id,userId},{$set:{lastReadMessageId:message._id,lastReadAt:new Date()}}),...conversation.members.filter(id=>String(id)!==userId).map(recipient=>MessageReceipt.updateOne({messageId:message._id,userId:recipient},{$setOnInsert:{messageId:message._id,userId:recipient}},{upsert:true}))]);
  await message.populate('sender','name username profilePhoto verified');if(attachment)await message.populate('attachment');return message.toObject();
}
export function mapMessage(message:Record<string,unknown>){const sender=message.sender as Record<string,unknown>;return{id:String(message._id),clientMessageId:message.clientMessageId,conversationId:String(message.conversation),sender,text:message.deletedForEveryoneAt?undefined:message.text,type:message.type,attachment:message.deletedForEveryoneAt?undefined:message.attachment,replyTo:message.replyTo?String(message.replyTo):undefined,readBy:((message.readBy as unknown[])??[]).map(String),editedAt:message.editedAt,deletedForEveryoneAt:message.deletedForEveryoneAt,createdAt:message.createdAt};}
