import crypto from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { Call, User } from '../src/models/index.js';
import { attachSockets } from '../src/sockets/index.js';

const base=process.env.TEST_MONGO_URI??'mongodb://127.0.0.1:27017';
const database=`instaframe_socket_${crypto.randomBytes(6).toString('hex')}`;
const uri=`${base.replace(/\/$/,'')}/${database}`;
const token=(id:string,username:string)=>jwt.sign({sub:id,username,role:'USER',type:'access'},env.JWT_SECRET,{expiresIn:'5m'});
const connected=(url:string,accessToken:string)=>new Promise<Socket>((resolve,reject)=>{const socket=connect(url,{auth:{token:accessToken},transports:['websocket'],forceNew:true});socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject)});
const event=<T>(socket:Socket,name:string)=>new Promise<T>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(`Timed out waiting for ${name}`)),1000);socket.once(name,(data:T)=>{clearTimeout(timeout);resolve(data)})});

describe('WebRTC signaling authorization',()=>{
  const server=createServer(app);const io=attachSockets(server);const sockets:Socket[]=[];let url='';let callerId='';let calleeId='';let outsiderId='';
  beforeAll(async()=>{await mongoose.connect(uri,{serverSelectionTimeoutMS:5000});const users=await User.create([{name:'Socket Caller',username:'socket.caller',email:'socket-caller@example.com',passwordHash:'test-only-hash'},{name:'Socket Callee',username:'socket.callee',email:'socket-callee@example.com',passwordHash:'test-only-hash'},{name:'Socket Outsider',username:'socket.outsider',email:'socket-outsider@example.com',passwordHash:'test-only-hash'}]);[callerId,calleeId,outsiderId]=users.map(user=>String(user._id));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${(server.address() as AddressInfo).port}`},10000);
  afterAll(async()=>{sockets.forEach(socket=>socket.disconnect());await io.close();if(mongoose.connection.db)await mongoose.connection.db.dropDatabase();await mongoose.disconnect()});

  it('rejects an invalid access token during the socket handshake',async()=>{
    const error=await new Promise<Error>(resolve=>{const socket=connect(url,{auth:{token:'invalid'},transports:['websocket'],forceNew:true,reconnection:false});sockets.push(socket);socket.once('connect_error',resolve)});
    expect(error.message).toBe('unauthorized');
  });

  it('routes offer/answer only between the stored call participants',async()=>{
    const [caller,callee,outsider]=await Promise.all([connected(url,token(callerId,'socket.caller')),connected(url,token(calleeId,'socket.callee')),connected(url,token(outsiderId,'socket.outsider'))]);sockets.push(caller,callee,outsider);
    const call=await Call.create({caller:callerId,callee:calleeId,kind:'video'});const callId=String(call._id);
    const offerPromise=event<{callId:string;recipientId:string;callerId:string}>(callee,'call:offer');caller.emit('call:offer',{callId,recipientId:calleeId,payload:{sdp:'offer'}});const offer=await offerPromise;
    expect(offer.callId).toBe(callId);expect(offer.callerId).toBe(callerId);
    let leaked=false;callee.once('call:offer',()=>{leaked=true});outsider.emit('call:offer',{callId,recipientId:calleeId,payload:{sdp:'forged'}});caller.emit('call:offer',{callId,recipientId:outsiderId,payload:{sdp:'misrouted'}});await new Promise(resolve=>setTimeout(resolve,100));expect(leaked).toBe(false);callee.removeAllListeners('call:offer');
    const answerPromise=event<{callId:string;callerId:string}>(caller,'call:answer');callee.emit('call:answer',{callId,recipientId:callerId,payload:{sdp:'answer'}});const answer=await answerPromise;
    expect(answer.callId).toBe(callId);expect(answer.callerId).toBe(calleeId);
  });
});
