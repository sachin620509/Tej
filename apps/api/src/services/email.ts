import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.js';

export type AuthMailKind = 'password_reset' | 'email_verification';
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function createAuthEmail(input:{to:string;kind:AuthMailKind;token:string}){
  const path=input.kind==='password_reset'?'/reset-password':'/verify-email';
  const url=`${env.CLIENT_URL}${path}?token=${encodeURIComponent(input.token)}`;
  const reset=input.kind==='password_reset';
  const subject=reset?'Reset your InstaFrame password':'Verify your InstaFrame email';
  const intro=reset?'Use this secure link to choose a new password. It expires in 30 minutes.':'Verify your email address to finish securing your InstaFrame account. This link expires in 24 hours.';
  return{to:input.to,from:env.EMAIL_FROM,subject,text:`${intro}\n\n${url}\n\nIf you did not request this, ignore this email.`,html:`<div style="font-family:system-ui;max-width:560px;margin:auto"><h1 style="font-size:24px">InstaFrame</h1><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#205c4d;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">${reset?'Reset password':'Verify email'}</a></p><p style="font-size:12px;color:#667">If you did not request this, ignore this email.</p></div>`,url};
}

let transport:Transporter|undefined;
function smtpTransport(){
  const user=env.SMTP_USER||env.SMTP_USERNAME;
  if(!env.SMTP_HOST||!user||!env.SMTP_PASSWORD)throw new AppError(503,'EMAIL_NOT_CONFIGURED','Email delivery is not configured');
  transport??=nodemailer.createTransport({host:env.SMTP_HOST,port:env.SMTP_PORT,secure:env.SMTP_SECURE,auth:{user,pass:env.SMTP_PASSWORD},connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000,tls:{rejectUnauthorized:true}});
  return transport;
}
export async function deliverAuthLink(input:{to:string;kind:AuthMailKind;token:string}){
  const message=createAuthEmail(input);
  if(env.NODE_ENV==='test')return;
  if(env.EMAIL_DELIVERY_MODE==='console'){
    if(env.NODE_ENV==='production')throw new AppError(503,'EMAIL_NOT_CONFIGURED','Console email delivery is disabled in production');
    console.warn(`[email:${input.kind}] ${input.to} ${message.url}`);
    return;
  }
  if(env.EMAIL_DELIVERY_MODE!=='smtp')throw new AppError(503,'EMAIL_NOT_CONFIGURED','Email delivery is disabled');
  try{await smtpTransport().sendMail({to:message.to,from:message.from,subject:message.subject,text:message.text,html:message.html})}catch(error){console.error('Email delivery failed',error instanceof Error?error.message:'unknown SMTP error');throw new AppError(502,'EMAIL_DELIVERY_FAILED','Email could not be delivered')}
}
