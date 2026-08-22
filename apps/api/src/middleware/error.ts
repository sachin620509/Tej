import type { ErrorRequestHandler, RequestHandler } from 'express'; import { ZodError } from 'zod';
export class AppError extends Error { constructor(public status:number,public code:string,message:string){super(message);} }
export const notFound:RequestHandler=(_req,_res,next)=>next(new AppError(404,'NOT_FOUND','Route not found'));
export const errorHandler:ErrorRequestHandler=(error,_req,res,_next)=>{const e=error instanceof ZodError?new AppError(400,'VALIDATION_ERROR',error.issues[0]?.message??'Invalid request'):error instanceof AppError?error:new AppError(500,'INTERNAL_ERROR','Something went wrong'); if(process.env.NODE_ENV!=='test'&&e.status>=500) console.error(error); res.status(e.status).json({success:false,message:e.message,code:e.code});};
