import { z } from 'zod';

export const RESERVED_USERNAMES = new Set(['admin','administrator','support','system','official','root','security','help','instaframe']);
export const normalizeUsername=(value:string)=>value.trim().toLowerCase();
export const isReservedUsername=(value:string)=>{const normalized=normalizeUsername(value).replace(/[._]/g,'');return RESERVED_USERNAMES.has(normalized)||[...RESERVED_USERNAMES].some(name=>normalized===`${name}1`||normalized===`${name}0`)};
export const usernameSchema=z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/,'Use letters, numbers, dots or underscores; start and end with a letter or number').refine(value=>!isReservedUsername(value),'This username is reserved');
const clean=(max:number)=>z.string().trim().max(max).refine(value=>!/[<>]/.test(value),'HTML is not allowed');
const optionalUrl=z.union([z.literal(''),z.url().max(500).refine(value=>/^https:\/\//i.test(value),'Only HTTPS URLs are allowed')]).optional();

export const profileUpdateSchema=z.object({
  name:clean(80).min(2).optional(),username:usernameSchema.optional(),bio:clean(240).optional(),location:clean(100).optional(),profession:clean(80).optional(),organization:clean(120).optional(),website:optionalUrl,accountType:z.enum(['personal','creator','business']).optional(),
  profilePhoto:z.url().max(500).refine(value=>value.startsWith('https://res.cloudinary.com/'),'Avatar must use approved storage').optional(),profilePhotoPublicId:z.string().min(8).max(300).regex(/^instaframe\/avatars\//).optional(),
  socialLinks:z.object({instagram:optionalUrl,facebook:optionalUrl,youtube:optionalUrl,x:optionalUrl,linkedin:optionalUrl,website:optionalUrl,other:optionalUrl}).strict().optional()
}).strict().refine(value=>Boolean(value.profilePhoto)===Boolean(value.profilePhotoPublicId),'Avatar URL and storage ID must be provided together');

export const privacyUpdateSchema=z.object({isPrivate:z.boolean().optional(),allowProfileDiscovery:z.boolean().optional(),externalLinksVisibility:z.enum(['public','followers','private']).optional(),privacy:z.object({whoCanMessage:z.enum(['everyone','following','followers','mutuals','none']).optional(),whoCanCall:z.enum(['everyone','followers','none']).optional(),whoCanComment:z.enum(['everyone','followers','none']).optional(),showOnlineStatus:z.boolean().optional(),showLastSeen:z.boolean().optional(),allowOneFinalNote:z.boolean().optional()}).strict().optional()}).strict();
export const socialLinkSchema=z.object({platform:z.enum(['instagram','youtube','facebook','telegram','x','linkedin','github','website','custom']),label:clean(40).optional(),url:z.url().max(500).refine(value=>value.startsWith('https://'),'Only HTTPS links are allowed'),displayOrder:z.number().int().min(0).max(50).default(0),isVisible:z.boolean().default(true)}).strict().refine(value=>value.platform!=='custom'||Boolean(value.label),'Custom links need a label');
export const socialLinkOrderSchema=z.object({ids:z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(20)}).strict();
