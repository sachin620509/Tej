import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AuditLog, CloudinaryWebhookReceipt, MediaSafetyRecord, Post, Reel } from '../models/index.js';
import { verifyCloudinaryNotification } from '../services/cloudinaryWebhook.js';
type Notification={notification_type?:string;public_id?:string;resource_type?:string;moderation?:Array<{kind?:string;status?:string}>};
export const cloudinaryWebhookHandler:RequestHandler=async(req,res)=>{
  if(!Buffer.isBuffer(req.body))return res.status(400).json({success:false,message:'Raw webhook body required',code:'INVALID_WEBHOOK_BODY'});
  const timestamp=req.header('x-cld-timestamp'),signature=req.header('x-cld-signature');
  if(!verifyCloudinaryNotification({body:req.body,timestamp,signature,secret:env.CLOUDINARY_API_SECRET}))return res.status(401).json({success:false,message:'Invalid Cloudinary webhook signature',code:'INVALID_WEBHOOK_SIGNATURE'});
  let payload:Notification;try{payload=JSON.parse(req.body.toString('utf8')) as Notification}catch{return res.status(400).json({success:false,message:'Invalid webhook JSON',code:'INVALID_WEBHOOK_JSON'})}
  const receiptId=createHash('sha256').update(`${timestamp}:${signature}`).digest('hex');
  try{await CloudinaryWebhookReceipt.create({receiptId,notificationType:payload.notification_type,publicId:payload.public_id})}catch(error){if((error as {code?:number}).code===11000)return res.json({success:true,data:{duplicate:true}});throw error}
  const rejected=payload.moderation?.some(item=>['rejected','blocked'].includes(item.status??''))??false;
  const approved=payload.moderation?.some(item=>item.status==='approved')??false;
  if(payload.public_id){await MediaSafetyRecord.findOneAndUpdate({publicId:payload.public_id},{$set:{resourceType:payload.resource_type,status:rejected?'rejected':approved?'approved':'pending',provider:'cloudinary',reason:rejected?'Provider moderation rejected this asset':undefined,checkedAt:new Date()}},{upsert:true,new:true});if(rejected)await Promise.all([Post.updateMany({'media.publicId':payload.public_id,deletedAt:null},{$set:{deletedAt:new Date()}}),Reel.updateMany({'video.publicId':payload.public_id,deletedAt:null},{$set:{deletedAt:new Date()}})])}
  await AuditLog.create({action:rejected?'CLOUDINARY_MEDIA_REJECTED':'CLOUDINARY_WEBHOOK_RECEIVED',targetType:payload.resource_type??'media',targetId:payload.public_id,metadata:{notificationType:payload.notification_type,moderation:payload.moderation}});
  return res.json({success:true,data:{accepted:true,safetyStatus:rejected?'rejected':'received'}});
};
