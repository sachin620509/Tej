import { describe,expect,it } from 'vitest';
import { registrationSchema } from '../src/validators/auth.js';
import { profileUpdateSchema,socialLinkSchema,usernameSchema } from '../src/validators/profile.js';
import { profilePermissions } from '../src/services/profile.js';

describe('Phase 2 profile security',()=>{
  it('normalizes safe usernames and rejects reserved or impersonation-friendly variants',()=>{
    expect(usernameSchema.parse('Safe.Name')).toBe('safe.name');
    for(const value of ['admin','administrator','support','system','official','root','admin_','official1'])expect(usernameSchema.safeParse(value).success).toBe(false);
  });
  it('applies the same username policy during registration',()=>{
    expect(registrationSchema.safeParse({email:'x@example.com',password:'very-secure-password',name:'Example User',username:'support'}).success).toBe(false);
  });
  it('does not accept verification or ownership fields in profile edits',()=>{
    expect(profileUpdateSchema.safeParse({verified:true}).success).toBe(false);
    expect(profileUpdateSchema.safeParse({userId:'507f1f77bcf86cd799439011'}).success).toBe(false);
  });
  it('requires approved avatar storage references as a pair',()=>{
    expect(profileUpdateSchema.safeParse({profilePhoto:'https://res.cloudinary.com/demo/image/upload/avatar.jpg'}).success).toBe(false);
    expect(profileUpdateSchema.safeParse({profilePhoto:'https://res.cloudinary.com/demo/image/upload/avatar.jpg',profilePhotoPublicId:'instaframe/avatars/user/avatar'}).success).toBe(true);
  });
  it('allows only HTTPS social links and requires custom labels',()=>{
    expect(socialLinkSchema.safeParse({platform:'github',url:'https://github.com/example'}).success).toBe(true);
    expect(socialLinkSchema.safeParse({platform:'custom',url:'https://example.com'}).success).toBe(false);
    expect(socialLinkSchema.safeParse({platform:'website',url:'javascript:alert(1)'}).success).toBe(false);
  });
  it('keeps private content hidden until an accepted relationship exists',()=>{
    expect(profilePermissions({isSelf:false,isPrivate:true,isFollowing:false,linkVisibility:'public'}).canViewPosts).toBe(false);
    expect(profilePermissions({isSelf:false,isPrivate:true,isFollowing:true,linkVisibility:'followers'}).canViewPosts).toBe(true);
  });
});
