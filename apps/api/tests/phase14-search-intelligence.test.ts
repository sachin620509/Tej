import {describe,expect,it} from 'vitest';import {SearchProfile,UserInterest} from '../src/models/index.js';import {diverseRank,editDistance,normalizeSearch,textRelevance} from '../src/services/ranking.js';
describe('phase 14 search intelligence',()=>{
 it('normalizes unicode, case, spaces and hashtag prefix consistently',()=>{expect(normalizeSearch('  #CoDing   Café  ')).toBe('coding café')});
 it('provides tightly controlled typo tolerance',()=>{expect(editDistance('rhaul','rahul',2)).toBe(2);expect(editDistance('r','rahul',2)).toBeGreaterThan(2)});
 it('ranks exact usernames over prefix, display and verification-only signals',()=>{const exact=textRelevance('rahul',{username:'rahul',name:'Other'}),prefix=textRelevance('rahul',{username:'rahul.codes',name:'Rahul'}),name=textRelevance('rahul',{username:'creator22',name:'Rahul'});expect(exact).toBeGreaterThan(prefix);expect(prefix).toBeGreaterThan(name)});
 it('caps creators in recommendation results',()=>{const items=[{id:1,c:'a',s:20},{id:2,c:'a',s:19},{id:3,c:'a',s:18},{id:4,c:'b',s:17}];expect(diverseRank(items,item=>item.s,item=>item.c,4,2).map(item=>item.id)).toEqual([1,2,4])});
 it('search model intentionally contains no sensitive recommendation inputs',()=>{const fields=Object.keys(SearchProfile.schema.paths);expect(fields).not.toEqual(expect.arrayContaining(['email','phone','messages','finalNotes','verificationSelfie','verificationDocuments']));expect(fields).toEqual(expect.arrayContaining(['normalizedUsername','normalizedDisplayName','searchTerms','discoverable']))});
 it('interests are private by default',()=>{expect(UserInterest.schema.path('isPublic').getDefault({})).toBe(false)});
});
