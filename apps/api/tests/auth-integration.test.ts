import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { AccountDeletionJob, AdminAction, AuditLog, Call, CloudinaryWebhookReceipt, Conversation, Follow, MediaSafetyRecord, Message, Post, Report, Session, User } from '../src/models/index.js';
import { createCloudinaryNotificationSignature } from '../src/services/cloudinaryWebhook.js';

const base=process.env.TEST_MONGO_URI??'mongodb://127.0.0.1:27017';
const database=`instaframe_integration_${crypto.randomBytes(6).toString('hex')}`;
const uri=`${base.replace(/\/$/,'')}/${database}`;
const originalCloudinarySecret=env.CLOUDINARY_API_SECRET;
const integrationCloudinarySecret='integration-cloudinary-webhook-secret';
const staffToken=(id:string,username:string,role:'MODERATOR'|'ADMIN')=>jwt.sign({sub:id,username,role,type:'access',mfaVerified:true},env.JWT_SECRET,{expiresIn:'5m'});

describe('database-backed authentication and privacy',()=>{
  let requesterToken:string,targetToken:string,requesterId:string,targetId:string,contactToken:string,contactId:string;
  beforeAll(async()=>{env.CLOUDINARY_API_SECRET=integrationCloudinarySecret;await mongoose.connect(uri,{serverSelectionTimeoutMS:5000})},10000);
  afterAll(async()=>{env.CLOUDINARY_API_SECRET=originalCloudinarySecret;if(mongoose.connection.db)await mongoose.connection.db.dropDatabase();await mongoose.disconnect()});

  it('registers with privacy-safe defaults and enforces uniqueness',async()=>{
    const body={name:'Integration Member',username:'integration.member',email:'integration@example.com',password:'StrongPassword!123'};
    const created=await request(app).post('/api/auth/register').send(body);
    requesterToken=created.body.data.accessToken;requesterId=created.body.data.user.id;
    expect(created.status).toBe(201);expect(created.body.data.user.allowPhotoDiscovery).toBe(false);expect(created.body.data.user.isPrivate).toBe(false);expect(created.headers['set-cookie']?.[0]).toContain('HttpOnly');expect(await User.countDocuments()).toBe(1);
    const duplicate=await request(app).post('/api/auth/register').send(body);
    expect(duplicate.status).toBe(409);expect(duplicate.body.code).toBe('ACCOUNT_EXISTS');
  });
  it('rotates a cookie session and rejects refresh without trusted origin',async()=>{
    const login=await request(app).post('/api/auth/login').send({email:'integration@example.com',password:'StrongPassword!123'});
    const cookie=login.headers['set-cookie']?.[0];expect(cookie).toBeTruthy();
    const missingOrigin=await request(app).post('/api/auth/refresh').set('Cookie',cookie);
    expect(missingOrigin.status).toBe(403);expect(missingOrigin.body.code).toBe('CSRF_ORIGIN_REJECTED');
    const refreshed=await request(app).post('/api/auth/refresh').set('Origin',env.CLIENT_URL).set('Cookie',cookie);
    expect(refreshed.status).toBe(200);expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
  });
  it('hides private posts until the owner accepts a follow request',async()=>{
    const target=await request(app).post('/api/auth/register').send({name:'Private Member',username:'private.member',email:'private@example.com',password:'StrongPassword!456'});
    targetToken=target.body.data.accessToken;targetId=target.body.data.user.id;
    await request(app).patch('/api/profiles/me/privacy').set('Authorization',`Bearer ${targetToken}`).send({isPrivate:true});
    const hidden=await request(app).get('/api/profiles/private.member').set('Authorization',`Bearer ${requesterToken}`);
    expect(hidden.body.data.canViewPosts).toBe(false);
    const follow=await request(app).post(`/api/profiles/${targetId}/follow`).set('Authorization',`Bearer ${requesterToken}`);
    expect(follow.status).toBe(201);expect(follow.body.data.status).toBe('pending');
    const queue=await request(app).get('/api/follow-requests').set('Authorization',`Bearer ${targetToken}`);
    const requestId=queue.body.data.items[0]._id;
    const unauthorized=await request(app).post(`/api/follow-requests/${requestId}/accept`).set('Authorization',`Bearer ${requesterToken}`);
    expect(unauthorized.status).toBe(404);
    const accepted=await request(app).post(`/api/follow-requests/${requestId}/accept`).set('Authorization',`Bearer ${targetToken}`);
    expect(accepted.body.data.status).toBe('accepted');
    const visible=await request(app).get('/api/profiles/private.member').set('Authorization',`Bearer ${requesterToken}`);
    expect(visible.body.data.canViewPosts).toBe(true);
  });
  it('blocking removes accepted relationships and repairs counters',async()=>{
    const blocked=await request(app).post(`/api/blocks/${requesterId}`).set('Authorization',`Bearer ${targetToken}`);
    expect(blocked.status).toBe(201);
    expect(await Follow.countDocuments({$or:[{follower:requesterId,following:targetId},{follower:targetId,following:requesterId}]})).toBe(0);
    const [requester,target]=await Promise.all([User.findById(requesterId).lean(),User.findById(targetId).lean()]);
    expect(requester?.followingCount).toBe(0);expect(target?.followersCount).toBe(0);
  });
  it('enforces messaging privacy, membership and blocking',async()=>{
    const contact=await request(app).post('/api/auth/register').send({name:'Trusted Contact',username:'trusted.contact',email:'contact@example.com',password:'StrongPassword!789'});
    contactToken=contact.body.data.accessToken;contactId=contact.body.data.user.id;
    const notFollowed=await request(app).post('/api/conversations').set('Authorization',`Bearer ${requesterToken}`).send({type:'direct',memberIds:[contactId]});
    expect(notFollowed.status).toBe(403);expect(notFollowed.body.code).toBe('MESSAGE_NOT_ALLOWED');
    await Follow.create({follower:requesterId,following:contactId,status:'accepted'});
    const created=await request(app).post('/api/conversations').set('Authorization',`Bearer ${requesterToken}`).send({type:'direct',memberIds:[contactId]});
    expect(created.status).toBe(201);const conversationId=created.body.data.id;
    const outsider=await request(app).get(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${targetToken}`);
    expect(outsider.status).toBe(404);
    const sent=await request(app).post(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${requesterToken}`).send({text:'Private integration message'});
    expect(sent.status).toBe(201);expect(await Message.countDocuments({conversation:conversationId})).toBe(1);
    await request(app).post(`/api/blocks/${requesterId}`).set('Authorization',`Bearer ${contactToken}`);
    const blocked=await request(app).post(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${requesterToken}`).send({text:'This must not be delivered'});
    expect(blocked.status).toBe(403);expect(blocked.body.code).toBe('INTERACTION_BLOCKED');expect(await Message.countDocuments({conversation:conversationId})).toBe(1);
  });
  it('enforces call privacy, participants and lifecycle transitions',async()=>{
    const blocked=await request(app).post('/api/calls').set('Authorization',`Bearer ${requesterToken}`).send({calleeId:targetId,kind:'video'});
    expect(blocked.status).toBe(403);expect(blocked.body.code).toBe('INTERACTION_BLOCKED');
    await request(app).delete(`/api/blocks/${requesterId}`).set('Authorization',`Bearer ${contactToken}`);
    await Follow.create({follower:requesterId,following:contactId,status:'accepted'});
    const created=await request(app).post('/api/calls').set('Authorization',`Bearer ${requesterToken}`).send({calleeId:contactId,kind:'audio'});
    expect(created.status).toBe(201);const callId=created.body.data.id;
    const callerAccept=await request(app).patch(`/api/calls/${callId}`).set('Authorization',`Bearer ${requesterToken}`).send({status:'accepted'});
    expect(callerAccept.status).toBe(403);
    const outsider=await request(app).patch(`/api/calls/${callId}`).set('Authorization',`Bearer ${targetToken}`).send({status:'accepted'});
    expect(outsider.status).toBe(404);
    const accepted=await request(app).patch(`/api/calls/${callId}`).set('Authorization',`Bearer ${contactToken}`).send({status:'accepted'});
    expect(accepted.status).toBe(200);expect((await Call.findById(callId).lean())?.answeredAt).toBeInstanceOf(Date);
    const ended=await request(app).patch(`/api/calls/${callId}`).set('Authorization',`Bearer ${requesterToken}`).send({status:'ended'});
    expect(ended.status).toBe(200);
    const repeated=await request(app).patch(`/api/calls/${callId}`).set('Authorization',`Bearer ${contactToken}`).send({status:'ended'});
    expect(repeated.status).toBe(409);expect(repeated.body.code).toBe('CALL_ENDED');
    expect(await Conversation.countDocuments({members:{$all:[requesterId,contactId]}})).toBe(1);
  });
  it('rejects forged Cloudinary ownership and persists owner media metadata',async()=>{
    const forged={caption:'forged',visibility:'public',commentsEnabled:true,media:[{publicId:`instaframe/${targetId}/posts/stolen`,secureUrl:'https://res.cloudinary.com/demo/image/upload/stolen.jpg',resourceType:'image'}]};
    const rejected=await request(app).post('/api/posts').set('Authorization',`Bearer ${requesterToken}`).send(forged);
    expect(rejected.status).toBe(400);expect(rejected.body.code).toBe('INVALID_MEDIA_OWNER');
    const owned={...forged,caption:'owned #integration',media:[{...forged.media[0],publicId:`instaframe/${requesterId}/posts/owned`}]};
    const created=await request(app).post('/api/posts').set('Authorization',`Bearer ${requesterToken}`).send(owned);
    expect(created.status).toBe(201);expect(created.body.data.media[0].publicId).toBe(owned.media[0].publicId);
  });
  it('authenticates Cloudinary callbacks, quarantines rejected media and ignores duplicate delivery',async()=>{
    const publicId=`instaframe/${requesterId}/posts/owned`;
    const payload={notification_type:'moderation',public_id:publicId,resource_type:'image',moderation:[{kind:'aws_rek',status:'rejected'}]};
    const body=Buffer.from(JSON.stringify(payload));
    const timestamp=Math.floor(Date.now()/1000);
    const forged=await request(app).post('/api/webhooks/cloudinary').set('Content-Type','application/json').set('x-cld-timestamp',String(timestamp)).set('x-cld-signature','forged').send(payload);
    expect(forged.status).toBe(401);expect(await CloudinaryWebhookReceipt.countDocuments()).toBe(0);
    const signature=createCloudinaryNotificationSignature(body,timestamp,integrationCloudinarySecret);
    const accepted=await request(app).post('/api/webhooks/cloudinary').set('Content-Type','application/json').set('x-cld-timestamp',String(timestamp)).set('x-cld-signature',signature).send(payload);
    expect(accepted.status).toBe(200);expect(accepted.body.data.safetyStatus).toBe('rejected');
    const [safety,post,audit]=await Promise.all([MediaSafetyRecord.findOne({publicId}).lean(),Post.findOne({'media.publicId':publicId}).lean(),AuditLog.findOne({action:'CLOUDINARY_MEDIA_REJECTED',targetId:publicId}).select('+metadata').lean()]);
    expect(safety?.status).toBe('rejected');expect(post?.deletedAt).toBeInstanceOf(Date);expect(audit?.metadata?.notificationType).toBe('moderation');
    const duplicate=await request(app).post('/api/webhooks/cloudinary').set('Content-Type','application/json').set('x-cld-timestamp',String(timestamp)).set('x-cld-signature',signature).send(payload);
    expect(duplicate.status).toBe(200);expect(duplicate.body.data.duplicate).toBe(true);expect(await AuditLog.countDocuments({action:'CLOUDINARY_MEDIA_REJECTED',targetId:publicId})).toBe(1);
  });
  it('creates an attributable report with validated target metadata',async()=>{
    const post=await Post.findOne({author:requesterId}).lean();
    const response=await request(app).post('/api/reports').set('Authorization',`Bearer ${targetToken}`).send({targetType:'post',targetId:String(post?._id),reason:'spam',details:'Database integration report'});
    expect(response.status).toBe(201);const stored=await Report.findById(response.body.data._id).lean();expect(String(stored?.reporter)).toBe(targetId);expect(stored?.status).toBe('open');
  });
  it('enforces moderation role boundaries and records content/account decisions',async()=>{
    const post=await Post.findOne({author:requesterId}).lean();
    const firstReport=await Report.findOne({targetType:'post',targetId:post?._id}).lean();
    const moderator=staffToken(targetId,'private.member','MODERATOR');
    const restored=await request(app).patch(`/api/admin/reports/${firstReport?._id}`).set('Authorization',`Bearer ${moderator}`).send({action:'restore',reason:'Content was incorrectly quarantined during review'});
    expect(restored.status).toBe(200);expect((await Post.findById(post?._id).lean())?.deletedAt).toBeNull();
    const repeated=await request(app).patch(`/api/admin/reports/${firstReport?._id}`).set('Authorization',`Bearer ${moderator}`).send({action:'restore',reason:'Attempt to process the resolved report again'});
    expect(repeated.status).toBe(409);expect(repeated.body.code).toBe('REPORT_RESOLVED');
    const secondReport=await request(app).post('/api/reports').set('Authorization',`Bearer ${targetToken}`).send({targetType:'post',targetId:String(post?._id),reason:'spam',details:'Second independent moderation review'});
    const removed=await request(app).patch(`/api/admin/reports/${secondReport.body.data._id}`).set('Authorization',`Bearer ${moderator}`).send({action:'remove_content',reason:'Confirmed repeated spam content violation'});
    expect(removed.status).toBe(200);expect((await Post.findById(post?._id).lean())?.deletedAt).toBeInstanceOf(Date);
    const userReport=await request(app).post('/api/reports').set('Authorization',`Bearer ${targetToken}`).send({targetType:'user',targetId:requesterId,reason:'harassment',details:'Account-level review requested'});
    const denied=await request(app).patch(`/api/admin/reports/${userReport.body.data._id}`).set('Authorization',`Bearer ${moderator}`).send({action:'suspend',reason:'Serious account-level policy violation'});
    expect(denied.status).toBe(403);expect((await User.findById(requesterId).lean())?.status).toBe('active');
    const administrator=staffToken(targetId,'private.member','ADMIN');
    const incompatible=await request(app).patch(`/api/admin/reports/${userReport.body.data._id}`).set('Authorization',`Bearer ${administrator}`).send({action:'remove_content',reason:'Invalid content action against a user target'});
    expect(incompatible.status).toBe(400);expect(incompatible.body.code).toBe('INVALID_MODERATION_ACTION');
    const suspended=await request(app).patch(`/api/admin/reports/${userReport.body.data._id}`).set('Authorization',`Bearer ${administrator}`).send({action:'suspend',reason:'Serious account-level policy violation'});
    expect(suspended.status).toBe(200);expect((await User.findById(requesterId).lean())?.status).toBe('suspended');
    const actions=await AdminAction.find({targetId:{$in:[String(post?._id),requesterId]}}).lean();
    expect(actions.map(item=>item.action)).toEqual(expect.arrayContaining(['restore','remove_content','suspend']));expect(actions).toHaveLength(3);
  });
  it('requires password confirmation and queues media before anonymizing an account',async()=>{
    const wrong=await request(app).post('/api/account/delete').set('Authorization',`Bearer ${requesterToken}`).send({password:'WrongPassword!999'});
    expect(wrong.status).toBe(401);expect(wrong.body.code).toBe('INVALID_PASSWORD');
    const deleted=await request(app).post('/api/account/delete').set('Authorization',`Bearer ${requesterToken}`).send({password:'StrongPassword!123'});
    expect(deleted.status,JSON.stringify(deleted.body)).toBe(200);expect(deleted.body.data.mediaCleanup).toBe('queued');
    const [user,post,job,activeSessions]=await Promise.all([User.findById(requesterId).select('+email').lean(),Post.findOne({author:requesterId}).lean(),AccountDeletionJob.findOne({userId:requesterId}).lean(),Session.countDocuments({userId:requesterId,revokedAt:null})]);
    expect(user?.status).toBe('deleted');expect(user?.allowPhotoDiscovery).toBe(false);expect(user?.email).toContain('@invalid.local');expect(post?.deletedAt).toBeInstanceOf(Date);expect(job?.mediaAssets.map(asset=>asset.publicId)).toContain(`instaframe/${requesterId}/posts/owned`);expect(activeSessions).toBe(0);
  });
});
