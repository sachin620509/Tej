import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, common } from '../src/theme';

type DocumentKey='privacy'|'terms'|'guidelines'|'copyright'|'data';
type Section={title:string;body:string};
const documents:Record<DocumentKey,{title:string;intro:string;sections:Section[]}>= {
  privacy:{title:'Privacy Policy',intro:'How InstaFrame handles your information and keeps discovery consent-based.',sections:[
    {title:'Information you choose to provide',body:'We process account details, profile information, user-provided social links, posts and other content needed to operate features you use. Login email, security information, verification material and private activity are not public profile fields.'},
    {title:'Photo discovery',body:'Photo discovery is off by default. It searches only approved photos of active InstaFrame members who explicitly opted in. It does not search the public internet or identify non-members. Disabling it removes the profile from future matching and queues associated index data for deletion.'},
    {title:'Private communication',body:'Private messages, One Final Notes, verification documents and call media are not automatically sent to AI systems. Blocking prevents follow, messaging, calling and discovery bypass. One Final Note remains a separate receiver-controlled, one-time feature.'},
    {title:'Your controls',body:'You can change privacy settings, revoke sessions, download your data and delete your account. Account deletion invalidates sessions, removes discovery indexing, hides content and queues stored media cleanup under the retention policy.'},
  ]},
  terms:{title:'Terms of Use',intro:'Rules for using InstaFrame responsibly.',sections:[
    {title:'Your account',body:'Provide accurate registration information, protect your credentials and use only accounts you are authorized to control. You are responsible for content you choose to publish.'},
    {title:'Acceptable use',body:'Do not harass, impersonate, defraud, threaten, exploit, scrape, automate bulk discovery, evade blocks or use the platform to identify non-consenting people.'},
    {title:'Content and AI assistance',body:'You retain responsibility for submitted and published content. AI suggestions may be inaccurate and are never auto-published; review and edit them before use.'},
    {title:'Enforcement',body:'Content or accounts may be restricted when rules or law require it. Reports are reviewed, important staff actions are audited and eligible enforcement decisions may be appealed.'},
  ]},
  guidelines:{title:'Community Guidelines',intro:'Help keep InstaFrame welcoming, authentic and safe.',sections:[
    {title:'Respect people',body:'Do not post harassment, credible threats, hateful abuse, non-consensual intimate content or material that exploits others. Respect blocks and privacy choices.'},
    {title:'Be authentic',body:'Do not impersonate people, coordinate scams, manipulate engagement or misrepresent verification. A verified badge is granted only through trusted review.'},
    {title:'Share safely',body:'Use content warnings where appropriate, avoid graphic or illegal material and report concerning content instead of amplifying it.'},
    {title:'Discovery boundaries',body:'InstaFrame Scan is member discovery, not public face identification. Never use it for surveillance, bulk scanning or attempts to expose private identities.'},
  ]},
  copyright:{title:'Copyright',intro:'Share media you own or have permission to use.',sections:[
    {title:'Your responsibility',body:'Upload only content you created, licensed or are otherwise permitted to share. Music and audio overlays must be user-owned or properly licensed.'},
    {title:'Reporting infringement',body:'Use the report flow and select Copyright. Include enough information for a responsible review; knowingly false claims may lead to restrictions.'},
    {title:'Review and restoration',body:'Moderators may remove reported content after review. Where supported, affected users can provide context or appeal an incorrect decision.'},
  ]},
  data:{title:'Data Policy',intro:'A plain-language summary of storage, processing and retention.',sections:[
    {title:'Storage',body:'MongoDB stores application records. Cloudinary stores and delivers media. Large media is not stored directly in database records. Provider credentials stay on trusted servers.'},
    {title:'Processing',body:'We process data to authenticate users, enforce privacy, deliver content, send notifications, prevent abuse and provide features explicitly requested by users.'},
    {title:'Sensitive data',body:'Passwords are hashed. Tokens and secrets are protected. Biometric-style discovery vectors, if used, are isolated and never exposed through normal APIs or admin dashboards.'},
    {title:'Retention',body:'Temporary scan images should not be retained unnecessarily. Operational and audit data is retained only as needed for security, legal obligations and abuse prevention, then deleted according to configured jobs.'},
  ]},
};
const tabs:[DocumentKey,string][]=[['privacy','Privacy'],['terms','Terms'],['guidelines','Guidelines'],['copyright','Copyright'],['data','Data']];

export default function Legal(){const params=useLocalSearchParams<{document?:string}>(),router=useRouter();const key=(params.document&&params.document in documents?params.document:'privacy') as DocumentKey,document=documents[key];return <ScrollView style={common.screen} contentContainerStyle={s.content}><Text style={common.eyebrow}>LEGAL & TRUST</Text><Text style={common.title}>{document.title}</Text><Text style={s.updated}>Effective 13 August 2026 · Product policy summary</Text><Text style={s.intro}>{document.intro}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{tabs.map(([value,label])=><Pressable key={value} style={[s.tab,key===value&&s.active]} onPress={()=>router.setParams({document:value})}><Text style={key===value?s.activeText:s.tabText}>{label}</Text></Pressable>)}</ScrollView>{document.sections.map((section,index)=><View style={s.card} key={section.title}><Text style={s.number}>{String(index+1).padStart(2,'0')}</Text><View style={s.copy}><Text style={s.heading}>{section.title}</Text><Text style={s.body}>{section.body}</Text></View></View>)}<View style={s.notice}><Text style={s.noticeTitle}>Important</Text><Text style={s.noticeBody}>InstaFrame is not an identity-verification authority. Possible photo matches are suggestions involving opted-in members, not proof of identity.</Text></View></ScrollView>}

const s=StyleSheet.create({content:{padding:20,paddingBottom:90},updated:{fontSize:11,color:colors.muted,marginTop:8},intro:{fontSize:16,color:colors.ink,lineHeight:23,marginTop:18},tabs:{gap:8,paddingVertical:18},tab:{paddingHorizontal:13,paddingVertical:9,borderRadius:20,backgroundColor:'#e3e9e5'},active:{backgroundColor:colors.green},tabText:{fontSize:11,color:colors.ink,fontWeight:'700'},activeText:{fontSize:11,color:'white',fontWeight:'900'},card:{backgroundColor:'white',borderWidth:1,borderColor:colors.line,borderRadius:14,padding:15,marginBottom:10,flexDirection:'row',gap:12},number:{color:colors.green,fontSize:12,fontWeight:'900'},copy:{flex:1},heading:{fontSize:16,fontWeight:'900',color:colors.ink},body:{color:colors.muted,lineHeight:20,marginTop:7},notice:{backgroundColor:'#fff1d8',borderRadius:14,padding:16,marginTop:8},noticeTitle:{fontWeight:'900',color:'#73521b'},noticeBody:{color:'#806126',lineHeight:19,marginTop:6}});
