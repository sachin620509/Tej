import { describe,expect,it } from 'vitest'; import { DISCOVERY_DISCLAIMER } from '@instaframe/contracts';
describe('privacy contract',()=>{it('states that discovery is opt-in',()=>expect(DISCOVERY_DISCLAIMER).toContain('voluntarily enabled'));});
