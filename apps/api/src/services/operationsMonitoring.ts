import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

export type OperationalAlert={type:'media_cleanup_repeated_failure';severity:'warning'|'critical';jobId:string;attempts:number;failedAssetCount:number;occurredAt:string};

export async function sendOperationalAlert(alert:OperationalAlert,request:typeof fetch=fetch){
  if(!env.OPERATIONS_ALERT_WEBHOOK_URL)return false;
  try{const response=await request(env.OPERATIONS_ALERT_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json',...(env.OPERATIONS_ALERT_TOKEN?{authorization:`Bearer ${env.OPERATIONS_ALERT_TOKEN}`}:{})},body:JSON.stringify({service:'instaframe-api',environment:env.NODE_ENV,...alert}),signal:AbortSignal.timeout(5000)});return response.ok}catch{return false}
}

export type CloudinaryUsage={checkedAt:string;plan?:string;credits:{used:number;limit:number;percent:number};storage:{used:number;limit:number;percent:number};bandwidth:{used:number;limit:number;percent:number};transformations:{used:number;limit:number;percent:number}};
type Metric={usage?:number;limit?:number;used_percent?:number};type UsageResponse={plan?:string;credits?:Metric;storage?:Metric;bandwidth?:Metric;transformations?:Metric};
const metric=(value?:Metric)=>{const used=Number(value?.usage)||0,limit=Number(value?.limit)||0;return{used,limit,percent:Number(value?.used_percent)||(limit>0?Math.round(used/limit*10000)/100:0)}};
export function normalizeCloudinaryUsage(value:UsageResponse):CloudinaryUsage{return{checkedAt:new Date().toISOString(),plan:value.plan,credits:metric(value.credits),storage:metric(value.storage),bandwidth:metric(value.bandwidth),transformations:metric(value.transformations)}}
let cached:{expiresAt:number,value:CloudinaryUsage}|undefined;
export async function getCloudinaryUsage(){if(!env.CLOUDINARY_API_SECRET)throw new Error('Cloudinary is not configured');if(cached&&cached.expiresAt>Date.now())return cached.value;cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});const value=normalizeCloudinaryUsage(await cloudinary.api.usage() as UsageResponse);cached={value,expiresAt:Date.now()+env.CLOUDINARY_USAGE_CACHE_MS};return value}
