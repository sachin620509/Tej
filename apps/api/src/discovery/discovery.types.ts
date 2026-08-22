export type ScanImage={buffer:Buffer;mimeType:'image/jpeg'|'image/png'|'image/webp';filename:string;width:number;height:number};
export type MatcherCandidate={userId:string;similarity:number};
export type ScanMatch={userId:string;username:string;displayName:string;profilePhoto?:string|null;similarity:number;verified:boolean;socialLinks?:Record<string,string|null>};
